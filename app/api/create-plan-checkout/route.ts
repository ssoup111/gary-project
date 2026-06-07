import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Checkout environment variables are not configured." },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { planId } = await req.json();

    if (!planId) {
      return NextResponse.json(
        { success: false, error: "Plan ID is required." },
        { status: 400 }
      );
    }

    const { data: plan, error } = await supabaseAdmin
      .from("product_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (error || !plan) {
      return NextResponse.json(
        { success: false, error: "Plan not found." },
        { status: 404 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://friendsbehindbars.com";
    const isSubscription = plan.plan_type === "subscription";

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Friends Behind Bars ${plan.name}`,
              description: plan.description || "Friends Behind Bars image plan",
            },
            unit_amount: plan.price_cents,
            ...(isSubscription
              ? { recurring: { interval: "month" as const } }
              : {}),
          },
          quantity: 1,
        },
      ],
      metadata: {
        planId: plan.id,
        planSlug: plan.slug,
        planType: plan.plan_type,
      },
      success_url: `${appUrl}/subscriptions?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscriptions?payment=cancelled`,
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (error) {
    console.error("Plan checkout error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
