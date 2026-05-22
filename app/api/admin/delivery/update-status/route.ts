import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ success: false, error: "Supabase not configured." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { deliveryId, status, adminNotes } = await req.json();

    const updateData: { status?: string; admin_notes?: string } = {};
    if (status !== undefined) updateData.status = status;
    if (adminNotes !== undefined) updateData.admin_notes = adminNotes;

    const { error } = await supabase.from("delivery_queue").update(updateData).eq("id", deliveryId);
    if (error) return NextResponse.json({ success: false, error: error.message });

    // Send delivery notification email when status is "completed"
    if (status === "completed" && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      // Get delivery details
      const { data: delivery } = await supabase
        .from("delivery_queue")
        .select("order_id, recipient_id")
        .eq("id", deliveryId)
        .single();

      if (delivery?.order_id) {
        // Get order and image info
        const { data: order } = await supabase
          .from("orders")
          .select("id, total_cents, stripe_checkout_session_id")
          .eq("id", delivery.order_id)
          .single();

        // Get recipient info
        let recipientName = "Your recipient";
        let facilityName = "their facility";
        if (delivery.recipient_id) {
          const { data: recipient } = await supabase
            .from("inmate_contacts")
            .select("full_name, facility_name, state")
            .eq("id", delivery.recipient_id)
            .single();
          if (recipient) {
            recipientName = recipient.full_name || recipientName;
            facilityName = recipient.facility_name || facilityName;
          }
        }

        // Get image
        const { data: item } = await supabase
          .from("order_items")
          .select("generated_image_id")
          .eq("order_id", delivery.order_id)
          .single();

        let imageUrl = null;
        if (item?.generated_image_id) {
          const { data: image } = await supabase
            .from("generated_images")
            .select("image_url")
            .eq("id", item.generated_image_id)
            .single();
          imageUrl = image?.image_url || null;
        }

        // Get customer email from Stripe session if available
        let customerEmail: string | null = null;
        if (order?.stripe_checkout_session_id && process.env.STRIPE_SECRET_KEY) {
          try {
            const Stripe = (await import("stripe")).default;
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
            customerEmail = session.customer_details?.email || null;
          } catch {
            // Stripe lookup failed, skip email
          }
        }

        if (customerEmail) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jpix-eight.vercel.app";
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
          });

          const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px}.container{max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden}.header{background:#18181b;color:white;padding:32px}.header h1{margin:0;font-size:22px;font-weight:900}.header p{margin:8px 0 0;color:#a1a1aa;font-size:14px}.body{padding:32px}.body h2{font-size:20px;font-weight:900;color:#18181b;margin:0 0 8px}.body p{font-size:16px;color:#374151;line-height:1.7;margin:0 0 16px}.image-box{border-radius:12px;overflow:hidden;margin:24px 0;background:#000}.image-box img{width:100%;display:block}.detail-box{background:#f9fafb;border-radius:12px;padding:20px;margin:24px 0;font-size:15px}.cta{display:block;background:#18181b;color:white;text-decoration:none;text-align:center;padding:16px;border-radius:12px;font-weight:900;font-size:16px;margin:24px 0}.footer{padding:24px 32px;background:#f9fafb;font-size:13px;color:#6b7280;text-align:center}</style></head><body><div class="container"><div class="header"><h1>Friends Behind Bars</h1><p>Delivery Confirmation</p></div><div class="body"><h2>Your image has been delivered! ✅</h2><p>Great news — your image has been successfully delivered to ${recipientName} at ${facilityName}.</p>${imageUrl ? '<div class="image-box"><img src="' + imageUrl + '" alt="Delivered image" /></div>' : ""}<div class="detail-box"><strong>Recipient:</strong> ${recipientName}<br/><strong>Facility:</strong> ${facilityName}<br/><strong>Order ID:</strong> ${delivery.order_id.slice(0, 8).toUpperCase()}<br/>${adminNotes ? "<strong>Notes:</strong> " + adminNotes : ""}</div><a href="${appUrl}/my-orders" class="cta">View My Orders →</a><p>Thank you for using Friends Behind Bars.</p></div><div class="footer"><p>Friends Behind Bars • Approved digital image collections for incarcerated recipients</p></div></div></body></html>`;

          await transporter.sendMail({
            from: `"Friends Behind Bars" <${process.env.GMAIL_USER}>`,
            to: customerEmail,
            subject: "Your image has been delivered — Friends Behind Bars",
            html,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
