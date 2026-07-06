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

export async function POST(req: Request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const supabase = getServiceClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://friendsbehindbars.com";

    const body = await req.json();
    const { planSlug, imageId, recipientData, customerEmail } = body;
    // recipientData: { firstName, lastName, offenderId, facility, state }

    if (!planSlug || !customerEmail) {
      return NextResponse.json({ success: false, error: "planSlug and customerEmail are required." }, { status: 400 });
    }

    // Load the plan
    const { data: plan, error: planError } = await supabase
      .from("product_plans")
      .select("*")
      .eq("slug", planSlug)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ success: false, error: "Plan not found." }, { status: 404 });
    }

    // For individual single image — imageId is required
    if (plan.plan_type === "individual" && plan.image_count === 1 && !imageId) {
      return NextResponse.json({ success: false, error: "imageId is required for single image orders." }, { status: 400 });
    }

    // Save recipient
    let recipientId: string | null = null;
    if (recipientData) {
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
    }

    // Create the order record
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        recipient_id: recipientId,
        purchase_type: plan.plan_type,
        status: "pending",
        payment_status: "pending",
        total_cents: plan.price_cents,
        customer_email: customerEmail,
        plan_id: plan.id,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: "Failed to create order." }, { status: 500 });
    }

    // For single image orders — attach image + delivery queue entry
    if (imageId) {
      await supabase.from("order_items").insert({ order_id: order.id, generated_image_id: imageId, quantity: 1 });
      if (recipientId) {
        await supabase.from("delivery_queue").insert({ order_id: order.id, recipient_id: recipientId, status: "pending", platform: "Securus/JPay" });
      }
    }

    // Build Stripe line item description
    const descriptions: Record<string, string> = {
      individual: "Approved image delivered to your recipient's facility account.",
      package: `${plan.image_count} image credits — use anytime, never expire.`,
      subscription: `${plan.duration_days}-day daily image plan — 1 new image delivered every day.`,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Friends Behind Bars — ${plan.name}`,
              description: descriptions[plan.plan_type] || plan.description,
            },
            unit_amount: plan.price_cents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        orderId: order.id,
        planId: plan.id,
        planSlug: plan.slug,
        planType: plan.plan_type,
        imageCount: String(plan.image_count),
        durationDays: String(plan.duration_days || 0),
        recipientId: recipientId || "",
      },
      success_url: `${appUrl}/my-orders?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/order?payment=cancelled&plan=${planSlug}`,
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ success: false, error: "Failed to create checkout session." }, { status: 500 });
  }
}
