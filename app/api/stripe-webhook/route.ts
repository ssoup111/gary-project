import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json({ success: false, error: "Environment variables not configured." }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ success: false, error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
  } catch (error) {
    console.error("Stripe webhook verification failed:", error);
    return NextResponse.json({ success: false, error: "Invalid webhook signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    const planId = session.metadata?.planId;
    const planType = session.metadata?.planType;
    const userId = session.client_reference_id || null;
    const customerEmail = session.customer_details?.email || null;

    if (orderId) {
      await supabaseAdmin.from("orders").update({
        payment_status: "paid",
        status: "paid",
        delivery_status: "queued_for_delivery",
        stripe_checkout_session_id: session.id,
      }).eq("id", orderId);

      await supabaseAdmin.from("delivery_queue").update({ status: "queued_for_delivery" }).eq("order_id", orderId);

      const { data: orderData } = await supabaseAdmin
        .from("orders")
        .select(`id, total_cents, recipient_id, order_items ( generated_images ( prompt, image_url ) )`)
        .eq("id", orderId)
        .single();

      let recipientName = "Your recipient";
      let facilityName = "Not specified";
      let facilityState = "";

      if (orderData?.recipient_id) {
        const { data: recipientData } = await supabaseAdmin
          .from("recipients")
          .select("first_name,last_name,facility,state")
          .eq("id", orderData.recipient_id)
          .single();

        if (recipientData) {
          const fullName = [recipientData.first_name, recipientData.last_name].filter(Boolean).join(" ");
          recipientName = fullName || recipientName;
          facilityName = recipientData.facility || facilityName;
          facilityState = recipientData.state ? `, ${recipientData.state}` : "";
        }
      }

      const imageArr = orderData?.order_items?.[0]?.generated_images;
      const image = Array.isArray(imageArr) ? imageArr[0] : imageArr;
      const imageUrl = image?.image_url || null;
      const imagePrompt = image?.prompt || "Your selected image";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://friendsbehindbars.com";
      const amount = orderData?.total_cents ? `$${(orderData.total_cents / 100).toFixed(2)}` : "$1.99";

      if (customerEmail && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
        });

        const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px}.container{max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden}.header{background:#18181b;color:white;padding:32px}.header h1{margin:0;font-size:22px;font-weight:900}.header p{margin:8px 0 0;color:#a1a1aa;font-size:14px}.body{padding:32px}.body h2{font-size:20px;font-weight:900;color:#18181b;margin:0 0 8px}.body p{font-size:16px;color:#374151;line-height:1.7;margin:0 0 16px}.image-box{border-radius:12px;overflow:hidden;margin:24px 0;background:#000}.image-box img{width:100%;display:block}.detail-box{background:#f9fafb;border-radius:12px;padding:20px;margin:24px 0}.detail-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:15px}.detail-row:last-child{border-bottom:none}.detail-label{color:#6b7280;font-weight:600}.detail-value{color:#111827;font-weight:700}.cta{display:block;background:#18181b;color:white;text-decoration:none;text-align:center;padding:16px;border-radius:12px;font-weight:900;font-size:16px;margin:24px 0}.footer{padding:24px 32px;background:#f9fafb;font-size:13px;color:#6b7280;text-align:center}</style></head><body><div class="container"><div class="header"><h1>Friends Behind Bars</h1><p>Order Confirmation</p></div><div class="body"><h2>Your order is confirmed! ✅</h2><p>Thank you for your order. Your image has been queued and will be delivered to your recipient shortly.</p>${imageUrl ? `<div class="image-box"><img src="${imageUrl}" alt="Ordered image" /></div>` : ""}<p style="font-size:14px;color:#6b7280;margin-top:-8px;">${imagePrompt}</p><div class="detail-box"><div class="detail-row"><span class="detail-label">Order ID</span><span class="detail-value">${orderId.slice(0, 8).toUpperCase()}</span></div><div class="detail-row"><span class="detail-label">Recipient</span><span class="detail-value">${recipientName}</span></div><div class="detail-row"><span class="detail-label">Facility</span><span class="detail-value">${facilityName}${facilityState}</span></div><div class="detail-row"><span class="detail-label">Amount Paid</span><span class="detail-value">${amount}</span></div><div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">Queued for Delivery</span></div></div><a href="${appUrl}/my-orders" class="cta">Track Your Order →</a><p>Questions? Reply to this email or contact us at <a href="mailto:${process.env.GMAIL_USER}">${process.env.GMAIL_USER}</a>.</p></div><div class="footer"><p>Friends Behind Bars • Approved digital image collections for incarcerated recipients</p></div></div></body></html>`;

        await transporter.sendMail({
          from: `"Friends Behind Bars" <${process.env.GMAIL_USER}>`,
          to: customerEmail,
          subject: `Order Confirmed — Friends Behind Bars (#${orderId.slice(0, 8).toUpperCase()})`,
          html,
        });
      }
    }

    if (planId && planType === "subscription") {
      await supabaseAdmin.from("subscriptions").insert({
        user_id: userId,
        stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
        plan_name: session.metadata?.planSlug || "subscription",
        status: "active",
      });
    }
  }

  return NextResponse.json({ received: true });
}