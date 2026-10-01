import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * An order row is created the moment a customer clicks "Pay" — before
 * Stripe Checkout even loads — so we have something to attach the Stripe
 * session to. If the customer closes the tab, their card gets declined and
 * they give up, or anything else stops them from finishing on Stripe's
 * page, that order is never paid and never explicitly cancelled either. It
 * just sits there with payment_status "pending" forever: showing up in the
 * customer's My Orders as a permanently-unresolved "Payment Pending" order,
 * and in the admin view the same way.
 *
 * This runs once a day (see vercel.json) and marks anything that has been
 * sitting unpaid for more than STALE_HOURS as "abandoned" instead, so it
 * stops looking like something that still needs attention. Nothing was ever
 * charged for these - Stripe only tells us about a payment once it actually
 * succeeds (that's the webhook), so an order that never got a webhook call
 * never got a cent taken from anyone.
 */
const STALE_HOURS = 24;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString();

  const { data: expired, error } = await supabase
    .from("orders")
    .update({ status: "abandoned", payment_status: "abandoned" })
    .eq("payment_status", "pending")
    .lt("created_at", cutoff)
    .select("id");

  if (error) {
    console.error("Failed to expire stale orders:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, expiredCount: (expired || []).length });
}
