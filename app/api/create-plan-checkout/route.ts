import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const isSubscription = plan.plan_type === "subscription";

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `JPIX ${plan.name}`,
              description: plan.description || "JPIX image plan",
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
