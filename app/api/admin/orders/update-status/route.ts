import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Supabase admin credentials are not configured." },
        { status: 500 }
      );
    }

    // Verify admin
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const adminEmail = process.env.ADMIN_EMAIL;
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !adminEmail || !supabaseAnonKey) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabaseAuth.auth.getUser();
    if (!userData.user || userData.user.email !== adminEmail) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { orderId, status, deliveryStatus } = await req.json();

    const { error } = await supabase
      .from("orders")
      .update({
        status,
        delivery_status: deliveryStatus,
      })
      .eq("id", orderId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
