import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Look up a paid order by its Stripe checkout session id.
 *
 * Used by the thank-you page, which guests reach without an account. The
 * session id is a long random string only the buyer's browser is given, so
 * it acts as the key to their own order. Nothing here exposes anything that
 * would let someone browse other people's orders.
 */
export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ success: false, error: "Not configured." }, { status: 500 });
    }

    const sessionId = new URL(req.url).searchParams.get("session_id");
    if (!sessionId || !sessionId.startsWith("cs_")) {
      return NextResponse.json({ success: false, error: "Missing session id." }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: order } = await supabase
      .from("orders")
      .select("id, total_cents, item_count, payment_status, customer_email, recipient_id, created_at")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();

    if (!order) {
      // The webhook may not have landed yet; the page retries.
      return NextResponse.json({ success: false, pending: true });
    }

    let recipientName: string | null = null;
    if (order.recipient_id) {
      const { data: rec } = await supabase
        .from("recipients")
        .select("first_name, last_name")
        .eq("id", order.recipient_id)
        .maybeSingle();
      if (rec) recipientName = [rec.first_name, rec.last_name].filter(Boolean).join(" ") || null;
    }

    const { data: previews } = await supabase
      .from("order_items")
      .select("generated_images(image_url)")
      .eq("order_id", order.id)
      .limit(8);

    const images = (previews || [])
      .map((row) => {
        const raw = (row as unknown as { generated_images: unknown }).generated_images;
        const img = (Array.isArray(raw) ? raw[0] : raw) as { image_url?: string } | null;
        return img?.image_url || null;
      })
      .filter(Boolean) as string[];

    return NextResponse.json({
      success: true,
      order: {
        reference: order.id.slice(0, 8).toUpperCase(),
        totalCents: order.total_cents,
        itemCount: order.item_count,
        paid: order.payment_status === "paid",
        email: order.customer_email,
        recipientName,
        images,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
