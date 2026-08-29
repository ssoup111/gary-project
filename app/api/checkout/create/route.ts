import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type IncomingItem = {
  item_type: "image" | "plan";
  imageId?: string | null;
  planSlug?: string | null;
  categorySlugs?: string[];
};

type PlanRow = {
  id: string;
  name: string;
  slug: string;
  plan_type: string;
  description: string | null;
  image_count: number;
  price_cents: number;
  duration_days: number | null;
};

export async function POST(req: Request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const supabase = getServiceClient();
    // Send the customer back to whichever deployment they are actually on.
    // On a Vercel preview that is the preview URL, so a test checkout does
    // not bounce the tester over to the live site afterwards.
    const requestOrigin = (() => {
      try {
        const origin = req.headers.get("origin");
        if (origin) return origin;
        const host = req.headers.get("host");
        if (host) {
          const protocol = host.startsWith("localhost") ? "http" : "https";
          return `${protocol}://${host}`;
        }
      } catch {
        /* fall through to the configured URL */
      }
      return null;
    })();

    const appUrl =
      requestOrigin ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://friendsbehindbars.com";

    const body = await req.json();
    const {
      items,
      recipientData,
      customerEmail,
    }: {
      items: IncomingItem[];
      recipientData?: {
        firstName: string;
        lastName: string;
        offenderId: string;
        facility?: string;
        state?: string;
      };
      customerEmail?: string;
    } = body;

    /* ---------------- validation ---------------- */

    if (!customerEmail) {
      return NextResponse.json(
        { success: false, error: "customerEmail is required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Your cart is empty." },
        { status: 400 }
      );
    }

    if (!recipientData?.offenderId || !recipientData?.firstName) {
      return NextResponse.json(
        { success: false, error: "Recipient name and ID number are required." },
        { status: 400 }
      );
    }

    const imageItems = items.filter((i) => i.item_type === "image");
    const planItems = items.filter((i) => i.item_type === "plan");

    /* ---------------- price everything from the database ----------------
     * Never trust prices sent by the browser. */

    // Individual pictures are priced off the "single" plan.
    let singlePlan: PlanRow | null = null;
    if (imageItems.length > 0) {
      const { data } = await supabase
        .from("product_plans")
        .select("*")
        .eq("slug", "single")
        .eq("is_active", true)
        .single();
      singlePlan = (data as PlanRow) || null;
      if (!singlePlan) {
        return NextResponse.json(
          { success: false, error: "Single image pricing is unavailable." },
          { status: 500 }
        );
      }
    }

    // Confirm every picture in the cart is real and still approved.
    const requestedImageIds = imageItems
      .map((i) => i.imageId)
      .filter((id): id is string => Boolean(id));

    const uniqueImageIds = [...new Set(requestedImageIds)];

    let validImageIds: string[] = [];
    if (uniqueImageIds.length > 0) {
      const { data: imageRows } = await supabase
        .from("generated_images")
        .select("id")
        .in("id", uniqueImageIds)
        .eq("status", "approved");
      validImageIds = (imageRows || []).map((r: { id: string }) => r.id);
    }

    if (validImageIds.length !== uniqueImageIds.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "One or more pictures in your cart are no longer available. Please remove them and try again.",
        },
        { status: 400 }
      );
    }

    // Resolve the plan lines.
    const resolvedPlans: { plan: PlanRow; categorySlugs: string[] }[] = [];
    if (planItems.length > 0) {
      const slugs = [
        ...new Set(
          planItems.map((i) => i.planSlug).filter((s): s is string => Boolean(s))
        ),
      ];
      const { data: planRows } = await supabase
        .from("product_plans")
        .select("*")
        .in("slug", slugs)
        .eq("is_active", true);

      const bySlug = new Map<string, PlanRow>(
        ((planRows || []) as PlanRow[]).map((p) => [p.slug, p])
      );

      for (const item of planItems) {
        const plan = item.planSlug ? bySlug.get(item.planSlug) : undefined;
        if (!plan) {
          return NextResponse.json(
            { success: false, error: "A plan in your cart is no longer available." },
            { status: 400 }
          );
        }
        const categorySlugs = Array.isArray(item.categorySlugs)
          ? item.categorySlugs.filter(Boolean)
          : [];
        if (categorySlugs.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Please choose at least one category for the ${plan.name} plan.`,
            },
            { status: 400 }
          );
        }
        resolvedPlans.push({ plan, categorySlugs });
      }
    }

    /* ---------------- totals ---------------- */

    const imagesSubtotal = validImageIds.length * (singlePlan?.price_cents || 0);
    const plansSubtotal = resolvedPlans.reduce(
      (sum, r) => sum + r.plan.price_cents,
      0
    );
    const totalCents = imagesSubtotal + plansSubtotal;

    if (totalCents <= 0) {
      return NextResponse.json(
        { success: false, error: "Your cart total is zero." },
        { status: 400 }
      );
    }

    const itemCount = validImageIds.length + resolvedPlans.length;

    // What kind of order is this, for the admin views.
    const purchaseType =
      resolvedPlans.length === 0
        ? "individual"
        : validImageIds.length === 0 && resolvedPlans.length === 1
        ? resolvedPlans[0].plan.plan_type
        : "cart";

    /* ---------------- recipient ---------------- */

    let recipientId: string | null = null;
    const { data: recipient, error: recipientError } = await supabase
      .from("recipients")
      .insert({
        first_name: recipientData.firstName,
        last_name: recipientData.lastName,
        offender_id: recipientData.offenderId,
        facility: recipientData.facility || null,
        state: recipientData.state || null,
      })
      .select("id")
      .single();

    if (!recipientError && recipient) recipientId = recipient.id;

    /* ---------------- order ---------------- */

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        recipient_id: recipientId,
        purchase_type: purchaseType,
        status: "pending",
        payment_status: "pending",
        total_cents: totalCents,
        item_count: itemCount,
        customer_email: customerEmail,
        plan_id: resolvedPlans.length === 1 ? resolvedPlans[0].plan.id : null,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Order insert failed:", orderError);
      return NextResponse.json(
        { success: false, error: "Failed to create order." },
        { status: 500 }
      );
    }

    // Hand-picked pictures go in now. Plan pictures are chosen after payment
    // so we never reserve stock for an order that is never paid for.
    if (validImageIds.length > 0) {
      await supabase.from("order_items").insert(
        validImageIds.map((imageId) => ({
          order_id: order.id,
          generated_image_id: imageId,
          quantity: 1,
          source: "individual",
        }))
      );
    }

    if (resolvedPlans.length > 0) {
      await supabase.from("order_plans").insert(
        resolvedPlans.map(({ plan, categorySlugs }) => ({
          order_id: order.id,
          plan_id: plan.id,
          category_slugs: categorySlugs,
          price_cents: plan.price_cents,
          image_count: plan.image_count,
        }))
      );
    }

    /* ---------------- Stripe ---------------- */

    type StripeLineItem = NonNullable<
      Stripe.Checkout.SessionCreateParams["line_items"]
    >[number];
    const lineItems: StripeLineItem[] = [];

    if (validImageIds.length > 0 && singlePlan) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Friends Behind Bars — Individual Picture",
            description:
              "An approved picture you chose, delivered to your recipient's facility account.",
          },
          unit_amount: singlePlan.price_cents,
        },
        quantity: validImageIds.length,
      });
    }

    for (const { plan, categorySlugs } of resolvedPlans) {
      const description =
        plan.plan_type === "subscription"
          ? `${plan.duration_days}-day plan — one picture delivered every day from: ${categorySlugs.join(", ")}.`
          : `${plan.image_count} pictures, split across: ${categorySlugs.join(", ")}.`;

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `Friends Behind Bars — ${plan.name}`,
            description: description.slice(0, 500),
          },
          unit_amount: plan.price_cents,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customerEmail,
      line_items: lineItems,
      metadata: {
        orderId: order.id,
        recipientId: recipientId || "",
        itemCount: String(itemCount),
      },
      success_url: `${appUrl}/my-orders?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cart?payment=cancelled`,
    });

    return NextResponse.json({ success: true, url: session.url, orderId: order.id });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
