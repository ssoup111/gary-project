import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

type PlanMeta = {
  id: string;
  name: string;
  slug: string;
  plan_type: string;
  image_count: number;
  duration_days: number | null;
};

type OrderPlanLine = {
  id: string;
  plan_id: string;
  category_slugs: string[] | null;
  image_count: number;
  price_cents: number;
  fulfilled: boolean;
  product_plans: PlanMeta | PlanMeta[] | null;
};

type PickResult = {
  imageIds: string[];
  shortfall: number;
};

/** Fisher-Yates, so "a curated mix" is actually a mix. */
function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * How a plan's pictures divide across the categories the customer chose.
 * 50 over 2 categories is 25/25. 50 over 3 is 17/17/16 - the leftovers go
 * to the categories listed first.
 */
function splitAcrossCategories(total: number, categories: string[]) {
  const n = categories.length;
  if (n === 0) return [];
  const base = Math.floor(total / n);
  const remainder = total % n;
  return categories.map((slug, i) => ({
    slug,
    want: base + (i < remainder ? 1 : 0),
  }));
}

/**
 * Every picture on an order has to be one the recipient has not been sent
 * before, and one no other line on this order is already sending.
 * `excluded` carries that running set and is added to as we pick.
 */
async function pickPicturesForPlan(
  supabase: SupabaseClient,
  categorySlugs: string[],
  imageCount: number,
  excluded: Set<string>
): Promise<PickResult> {
  const picked: string[] = [];
  const plan = splitAcrossCategories(imageCount, categorySlugs);

  // Pull the approved pool for each chosen category once.
  const pools = new Map<string, string[]>();
  for (const slug of categorySlugs) {
    const { data } = await supabase
      .from("generated_images")
      .select("id")
      .eq("status", "approved")
      .eq("category_slug", slug);
    const ids = (data || [])
      .map((r: { id: string }) => r.id)
      .filter((id: string) => !excluded.has(id));
    pools.set(slug, shuffle(ids));
  }

  // First pass: give each category its share.
  for (const { slug, want } of plan) {
    const pool = pools.get(slug) || [];
    let taken = 0;
    while (taken < want && pool.length > 0) {
      const id = pool.shift()!;
      if (excluded.has(id)) continue;
      excluded.add(id);
      picked.push(id);
      taken++;
    }
  }

  // Second pass: a category that ran dry gets covered by the others.
  if (picked.length < imageCount) {
    for (const slug of categorySlugs) {
      const pool = pools.get(slug) || [];
      while (picked.length < imageCount && pool.length > 0) {
        const id = pool.shift()!;
        if (excluded.has(id)) continue;
        excluded.add(id);
        picked.push(id);
      }
      if (picked.length >= imageCount) break;
    }
  }

  return { imageIds: picked, shortfall: imageCount - picked.length };
}

/** Every picture this recipient has already been sent on a paid order. */
async function alreadySentToRecipient(
  supabase: SupabaseClient,
  recipientId: string | null
): Promise<Set<string>> {
  const sent = new Set<string>();
  if (!recipientId) return sent;

  const { data: thisRecipient } = await supabase
    .from("recipients")
    .select("offender_id,state")
    .eq("id", recipientId)
    .single();

  if (!thisRecipient?.offender_id) return sent;

  // A recipient row is written per order, so the same person appears more
  // than once. Their offender ID is what actually identifies them.
  const { data: sameperson } = await supabase
    .from("recipients")
    .select("id")
    .ilike("offender_id", thisRecipient.offender_id);

  const recipientIds = (sameperson || []).map((r: { id: string }) => r.id);
  if (recipientIds.length === 0) return sent;

  const { data: pastOrders } = await supabase
    .from("orders")
    .select("id")
    .in("recipient_id", recipientIds)
    .eq("payment_status", "paid");

  const orderIds = (pastOrders || []).map((o: { id: string }) => o.id);
  if (orderIds.length === 0) return sent;

  const { data: pastItems } = await supabase
    .from("order_items")
    .select("generated_image_id")
    .in("order_id", orderIds);

  for (const item of pastItems || []) {
    if (item.generated_image_id) sent.add(item.generated_image_id);
  }
  return sent;
}

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(
      { success: false, error: "Environment variables not configured." },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeSecretKey);
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { success: false, error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
  } catch (error) {
    console.error("Stripe webhook verification failed:", error);
    return NextResponse.json(
      { success: false, error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const { orderId } = session.metadata || {};
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://friendsbehindbars.com";

  if (!orderId) return NextResponse.json({ received: true });

  /* ------------------------------------------------------------------ *
   * The order was created under the customer's signed-in account email.
   * Stripe's own page can show a different one (saved card, edited field),
   * so the account email always wins - it is what /my-orders matches on.
   * ------------------------------------------------------------------ */
  const { data: orderRow } = await supabase
    .from("orders")
    .select("customer_email, recipient_id, payment_status")
    .eq("id", orderId)
    .single();

  if (!orderRow) return NextResponse.json({ received: true });

  // Stripe retries webhooks. Fulfilling twice would send duplicate pictures.
  if (orderRow.payment_status === "paid") {
    return NextResponse.json({ received: true, alreadyProcessed: true });
  }

  const customerEmail =
    orderRow.customer_email || session.customer_details?.email || null;
  const recipientId: string | null = orderRow.recipient_id;

  await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      status: "paid",
      stripe_checkout_session_id: session.id,
    })
    .eq("id", orderId);

  /* ------------------------------------------------------------------ *
   * Build the no-repeat exclusion set: everything this recipient has
   * already received, plus the pictures hand-picked on this order.
   * ------------------------------------------------------------------ */
  const excluded = await alreadySentToRecipient(supabase, recipientId);

  const { data: existingItems } = await supabase
    .from("order_items")
    .select("generated_image_id")
    .eq("order_id", orderId);

  const handPickedCount = (existingItems || []).length;
  for (const item of existingItems || []) {
    if (item.generated_image_id) excluded.add(item.generated_image_id);
  }

  /* ------------------------------------------------------------------ *
   * Fulfil each plan line on the order.
   * ------------------------------------------------------------------ */
  const { data: planLines } = await supabase
    .from("order_plans")
    .select(
      "id, plan_id, category_slugs, image_count, price_cents, fulfilled, " +
        "product_plans ( id, name, slug, plan_type, image_count, duration_days )"
    )
    .eq("order_id", orderId)
    .eq("fulfilled", false);

  const shortfallNotes: string[] = [];
  const planSummaries: { name: string; count: number; categories: string[] }[] = [];
  let planPictureCount = 0;

  const lines = (planLines || []) as unknown as OrderPlanLine[];

  for (const line of lines) {
    const planMeta = Array.isArray(line.product_plans)
      ? line.product_plans[0]
      : line.product_plans;
    if (!planMeta) continue;

    const categorySlugs: string[] = line.category_slugs || [];

    if (planMeta.plan_type === "subscription") {
      // Subscriptions keep delivering one a day - the cron picks each
      // day's picture, so nothing is chosen up front here.
      const days = planMeta.duration_days || 0;
      await supabase.from("subscriptions").insert({
        customer_email: customerEmail,
        plan_id: planMeta.id,
        plan_name: planMeta.slug || "subscription",
        status: "active",
        images_remaining: line.image_count,
        images_total: line.image_count,
        start_date: new Date().toISOString(),
        end_date: days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null,
        next_delivery_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        recipient_id: recipientId,
        stripe_subscription_id: session.id,
      });

      planSummaries.push({
        name: planMeta.name,
        count: line.image_count,
        categories: categorySlugs,
      });
      await supabase.from("order_plans").update({ fulfilled: true }).eq("id", line.id);
      continue;
    }

    // Packages: choose every picture now, all of them different.
    const { imageIds, shortfall } = await pickPicturesForPlan(
      supabase,
      categorySlugs,
      line.image_count,
      excluded
    );

    if (imageIds.length > 0) {
      await supabase.from("order_items").insert(
        imageIds.map((imageId) => ({
          order_id: orderId,
          generated_image_id: imageId,
          quantity: 1,
          source: "plan",
          plan_id: line.plan_id,
        }))
      );
      planPictureCount += imageIds.length;
    }

    if (shortfall > 0) {
      shortfallNotes.push(
        `${planMeta.name}: ${shortfall} of ${line.image_count} pictures could not be filled - ` +
          `not enough unused approved images in ${categorySlugs.join(", ")}.`
      );
    }

    planSummaries.push({
      name: planMeta.name,
      count: imageIds.length,
      categories: categorySlugs,
    });

    await supabase.from("order_plans").update({ fulfilled: true }).eq("id", line.id);
  }

  const totalPictures = handPickedCount + planPictureCount;

  await supabase
    .from("orders")
    .update({
      delivery_status: "queued_for_delivery",
      item_count: totalPictures,
      fulfillment_notes: shortfallNotes.length > 0 ? shortfallNotes.join(" ") : null,
    })
    .eq("id", orderId);

  /* ------------------------------------------------------------------ *
   * One delivery job for the whole order - one login, one session.
   * ------------------------------------------------------------------ */
  if (recipientId && totalPictures > 0) {
    const { data: existingQueue } = await supabase
      .from("delivery_queue")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existingQueue) {
      await supabase
        .from("delivery_queue")
        .update({ status: "queued_for_delivery" })
        .eq("id", existingQueue.id);
    } else {
      await supabase.from("delivery_queue").insert({
        order_id: orderId,
        recipient_id: recipientId,
        status: "queued_for_delivery",
        platform: "Securus/JPay",
        notes: `${totalPictures} picture${totalPictures === 1 ? "" : "s"} on this order.`,
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * Confirmation email
   * ------------------------------------------------------------------ */
  if (customerEmail) {
    const { data: orderData } = await supabase
      .from("orders")
      .select("id,total_cents,recipient_id")
      .eq("id", orderId)
      .single();

    let recipientName = "Your recipient";
    let facilityName = "Not specified";
    let facilityState = "";
    if (orderData?.recipient_id) {
      const { data: rec } = await supabase
        .from("recipients")
        .select("first_name,last_name,facility,state")
        .eq("id", orderData.recipient_id)
        .single();
      if (rec) {
        recipientName =
          [rec.first_name, rec.last_name].filter(Boolean).join(" ") || recipientName;
        facilityName = rec.facility || facilityName;
        facilityState = rec.state ? `, ${rec.state}` : "";
      }
    }

    // A few thumbnails so the email is not just text.
    const { data: previewItems } = await supabase
      .from("order_items")
      .select("generated_images ( image_url )")
      .eq("order_id", orderId)
      .limit(6);

    const thumbs = (previewItems || [])
      .map((row: { generated_images: unknown }) => {
        const img = Array.isArray(row.generated_images)
          ? row.generated_images[0]
          : row.generated_images;
        return (img as { image_url?: string } | null)?.image_url || null;
      })
      .filter(Boolean) as string[];

    const amount = orderData?.total_cents
      ? `$${(orderData.total_cents / 100).toFixed(2)}`
      : "";

    const lineRows: string[] = [];
    if (handPickedCount > 0) {
      lineRows.push(
        `<div class="detail-row"><span class="detail-label">Pictures you chose</span><span class="detail-value">${handPickedCount}</span></div>`
      );
    }
    for (const p of planSummaries) {
      lineRows.push(
        `<div class="detail-row"><span class="detail-label">${p.name}</span><span class="detail-value">${p.count} · ${p.categories.join(", ")}</span></div>`
      );
    }

    const html = `<!DOCTYPE html><html><head><style>
body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px}
.container{max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden}
.header{background:#0A3161;color:white;padding:32px}
.header h1{margin:0;font-size:22px;font-weight:900}
.header p{margin:8px 0 0;color:#cbd5e1;font-size:14px}
.body{padding:32px}
.body h2{font-size:20px;font-weight:900;color:#0A3161;margin:0 0 8px}
.body p{font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px}
.thumbs{display:block;margin:24px 0;font-size:0}
.thumbs img{width:31%;margin:1%;border-radius:8px;display:inline-block;vertical-align:top}
.detail-box{background:#f9fafb;border-radius:12px;padding:20px;margin:24px 0}
.detail-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:15px}
.detail-row:last-child{border-bottom:none}
.detail-label{color:#6b7280;font-weight:600}
.detail-value{color:#111827;font-weight:700;text-align:right}
.cta{display:block;background:#A6412B;color:white;text-decoration:none;text-align:center;padding:16px;border-radius:12px;font-weight:900;font-size:16px;margin:24px 0}
.footer{padding:24px 32px;background:#f9fafb;font-size:13px;color:#6b7280;text-align:center}
</style></head><body>
<div class="container">
  <div class="header"><h1>Friends Behind Bars</h1><p>Order Confirmed</p></div>
  <div class="body">
    <h2>You're all set! ✅</h2>
    <p>${totalPictures} picture${totalPictures === 1 ? "" : "s"} ${totalPictures === 1 ? "is" : "are"} queued for delivery to ${recipientName}. Every picture is different — nothing they have already received.</p>
    ${thumbs.length > 0 ? `<div class="thumbs">${thumbs.map((u) => `<img src="${u}" alt="" />`).join("")}</div>` : ""}
    <div class="detail-box">
      <div class="detail-row"><span class="detail-label">Order</span><span class="detail-value">#${orderId.slice(0, 8).toUpperCase()}</span></div>
      ${lineRows.join("")}
      <div class="detail-row"><span class="detail-label">Recipient</span><span class="detail-value">${recipientName}</span></div>
      <div class="detail-row"><span class="detail-label">Facility</span><span class="detail-value">${facilityName}${facilityState}</span></div>
      ${amount ? `<div class="detail-row"><span class="detail-label">Amount Paid</span><span class="detail-value">${amount}</span></div>` : ""}
    </div>
    <a href="${appUrl}/my-orders" class="cta">View My Orders →</a>
    <p>Questions? Just reply to this email and we'll help.</p>
  </div>
  <div class="footer"><p>Friends Behind Bars • Approved pictures delivered to incarcerated recipients</p></div>
</div></body></html>`;

    const result = await sendEmail({
      to: customerEmail,
      subject: `Order Confirmed — ${totalPictures} picture${totalPictures === 1 ? "" : "s"} on the way (#${orderId.slice(0, 8).toUpperCase()})`,
      html,
    });
    if (!result.ok) console.error("Confirmation email not sent:", result.error);
  }

  return NextResponse.json({ received: true });
}
