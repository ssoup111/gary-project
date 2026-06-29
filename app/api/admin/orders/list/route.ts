import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "ssoup1@protonmail.com";
    const authHeader = req.headers.get("authorization");

    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey || !authHeader) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    // Verify admin
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabaseAuth.auth.getUser();
    if (!userData.user || userData.user.email !== adminEmail) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    // Use service role to bypass RLS — admin sees all orders
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status") || "all";
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);

    let query = supabase
      .from("orders")
      .select(`
        id,
        customer_email,
        status,
        payment_status,
        delivery_status,
        total_cents,
        created_at,
        recipient_id,
        order_items (
          id,
          image_id,
          generated_images ( image_url, prompt )
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data: orders, error } = await query;
    if (error) return NextResponse.json({ success: false, error: error.message });

    // Enrich with recipient info
    const enriched = await Promise.all(
      (orders || []).map(async (order) => {
        let recipient = null;
        if (order.recipient_id) {
          const { data } = await supabase
            .from("recipients")
            .select("first_name, last_name, offender_id, facility, state")
            .eq("id", order.recipient_id)
            .single();
          recipient = data;
        }
        return { ...order, recipient };
      })
    );

    return NextResponse.json({ success: true, orders: enriched });
  } catch {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
