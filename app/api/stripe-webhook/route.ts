import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !stripeSecretKey ||
    !stripeWebhookSecret ||
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Stripe webhook environment variables are not configured.",
      },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeSecretKey);
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

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
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      stripeWebhookSecret
    );
  } catch (error) {
    console.error("Stripe webhook verification failed:", error);

    return NextResponse.json(
      { success: false, error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const orderId = session.metadata?.orderId;
    const planId = session.metadata?.planId;
    const planType = session.metadata?.planType;

    if (orderId) {
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          status: "paid",
          delivery_status: "queued_for_delivery",
          stripe_checkout_session_id: session.id,
        })
        .eq("id", orderId);

      await supabaseAdmin
        .from("delivery_queue")
        .update({
          status: "queued_for_delivery",
        })
        .eq("order_id", orderId);
    }

    if (planId && planType === "subscription") {
      await supabaseAdmin.from("subscriptions").insert({
        stripe_subscription_id:
          typeof session.subscription === "string"
            ? session.subscription
            : null,
        plan_name: session.metadata?.planSlug || "subscription",
        status: "active",
      });
    }
  }

  return NextResponse.json({ received: true });
}
