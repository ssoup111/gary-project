import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json({ success: false, error: "Environment variables not configured." }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) return NextResponse.json({ success: false, error: "Missing Stripe signature." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
  } catch (error) {
    console.error("Stripe webhook verification failed:", error);
    return NextResponse.json({ success: false, error: "Invalid webhook signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { orderId, planId, planType, planSlug, imageCount, durationDays, recipientId } = session.metadata || {};
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://friendsbehindbars.com";

    if (!orderId) return NextResponse.json({ received: true });

    // The order was created under the customer's actual signed-in account email
    // (see /api/checkout/create). Stripe's own checkout page can show/accept a
    // different email (saved card, edited field, etc.) — session.customer_details.email
    // reflects THAT, not the account. Always prefer the account's email so the
    // confirmation lands in the right inbox and subscriptions/orders line up under
    // the same account (this also keeps them visible under the RLS policies on
    // /my-orders, which match on the account's email).
    const { data: orderRow } = await supabase.from("orders").select("customer_email").eq("id", orderId).single();
    const customerEmail = orderRow?.customer_email || session.customer_details?.email || null;

    // Mark order paid
    await supabase.from("orders").update({
      payment_status: "paid",
      status: "paid",
      delivery_status: planType === "individual" ? "queued_for_delivery" : "pending",
      stripe_checkout_session_id: session.id,
    }).eq("id", orderId);

    // Handle per plan type
    if (planType === "individual") {
      // Queue delivery for single image
      await supabase.from("delivery_queue").update({ status: "queued_for_delivery" }).eq("order_id", orderId);
    }

    if (planType === "package" || planType === "subscription") {
      // Create subscription/package record
      const imageTotal = parseInt(imageCount || "0", 10);
      const days = parseInt(durationDays || "0", 10);
      const startDate = new Date();
      const endDate = days > 0 ? new Date(Date.now() + days * 86400000) : null;

      await supabase.from("subscriptions").insert({
        customer_email: customerEmail,
        plan_id: planId || null,
        plan_name: planSlug || "package",
        status: "active",
        images_remaining: imageTotal,
        images_total: imageTotal,
        start_date: startDate.toISOString(),
        end_date: endDate ? endDate.toISOString() : null,
        next_delivery_date: planType === "subscription" ? new Date(Date.now() + 86400000).toISOString().split("T")[0] : null,
        recipient_id: recipientId || null,
        stripe_subscription_id: session.id,
      });
    }

    // Send confirmation email
    if (customerEmail) {
      // Fetch order + image data for email
      const { data: orderData } = await supabase
        .from("orders")
        .select(`id, total_cents, recipient_id, order_items ( generated_images ( prompt, image_url ) )`)
        .eq("id", orderId)
        .single();

      let recipientName = "Your recipient";
      let facilityName = "Not specified";
      let facilityState = "";
      if (orderData?.recipient_id) {
        const { data: rec } = await supabase.from("recipients").select("first_name,last_name,facility,state").eq("id", orderData.recipient_id).single();
        if (rec) {
          recipientName = [rec.first_name, rec.last_name].filter(Boolean).join(" ") || recipientName;
          facilityName = rec.facility || facilityName;
          facilityState = rec.state ? `, ${rec.state}` : "";
        }
      }

      const imageArr = orderData?.order_items?.[0]?.generated_images;
      const image = Array.isArray(imageArr) ? imageArr[0] : imageArr;
      const imageUrl = image?.image_url || null;
      const amount = orderData?.total_cents ? `$${(orderData.total_cents / 100).toFixed(2)}` : "";

      const planLabels: Record<string, string> = {
        individual: "Single Image",
        package: `${imageCount}-Image Package`,
        subscription: `${durationDays}-Day Daily Subscription`,
      };
      const planLabel = planLabels[planType || "individual"] || "Order";

      const deliveryNote = planType === "individual"
        ? "Your image has been queued and will be delivered to your recipient shortly."
        : planType === "package"
        ? `Your ${imageCount}-image package is active. Images will be delivered as you use your credits.`
        : `Your daily subscription is active. Starting tomorrow, one new image will be delivered to your recipient every day.`;

      const html = `<!DOCTYPE html><html><head><style>
body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px}
.container{max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden}
.header{background:#18181b;color:white;padding:32px}
.header h1{margin:0;font-size:22px;font-weight:900}
.header p{margin:8px 0 0;color:#a1a1aa;font-size:14px}
.body{padding:32px}
.body h2{font-size:20px;font-weight:900;color:#18181b;margin:0 0 8px}
.body p{font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px}
.image-box{border-radius:12px;overflow:hidden;margin:24px 0;background:#000}
.image-box img{width:100%;display:block}
.detail-box{background:#f9fafb;border-radius:12px;padding:20px;margin:24px 0}
.detail-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:15px}
.detail-row:last-child{border-bottom:none}
.detail-label{color:#6b7280;font-weight:600}
.detail-value{color:#111827;font-weight:700}
.cta{display:block;background:#18181b;color:white;text-decoration:none;text-align:center;padding:16px;border-radius:12px;font-weight:900;font-size:16px;margin:24px 0}
.footer{padding:24px 32px;background:#f9fafb;font-size:13px;color:#6b7280;text-align:center}
</style></head><body>
<div class="container">
  <div class="header"><h1>Friends Behind Bars</h1><p>${planLabel} — Confirmed</p></div>
  <div class="body">
    <h2>You're all set! ✅</h2>
    <p>${deliveryNote}</p>
    ${imageUrl ? `<div class="image-box"><img src="${imageUrl}" alt="Ordered image" /></div>` : ""}
    <div class="detail-box">
      <div class="detail-row"><span class="detail-label">Order</span><span class="detail-value">#${orderId.slice(0, 8).toUpperCase()}</span></div>
      <div class="detail-row"><span class="detail-label">Plan</span><span class="detail-value">${planLabel}</span></div>
      ${planType !== "individual" ? `<div class="detail-row"><span class="detail-label">Images</span><span class="detail-value">${imageCount} total</span></div>` : ""}
      <div class="detail-row"><span class="detail-label">Recipient</span><span class="detail-value">${recipientName}</span></div>
      <div class="detail-row"><span class="detail-label">Facility</span><span class="detail-value">${facilityName}${facilityState}</span></div>
      ${amount ? `<div class="detail-row"><span class="detail-label">Amount Paid</span><span class="detail-value">${amount}</span></div>` : ""}
    </div>
    <a href="${appUrl}/my-orders" class="cta">View My Orders →</a>
    <p>Questions? Just reply to this email and we'll help.</p>
  </div>
  <div class="footer"><p>Friends Behind Bars • Approved digital image collections for incarcerated recipients</p></div>
</div></body></html>`;

      const result = await sendEmail({
        to: customerEmail,
        subject: `${planLabel} Confirmed — Friends Behind Bars (#${orderId.slice(0, 8).toUpperCase()})`,
        html,
      });
      if (!result.ok) {
        console.error("Confirmation email not sent:", result.error);
      }
    }
  }

  return NextResponse.json({ received: true });
}
