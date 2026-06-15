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

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const url = new URL(req.url);
    const filter = url.searchParams.get("status") || "all";

    let query = supabase
      .from("delivery_queue")
      .select("id, order_id, recipient_id, status, platform, admin_notes, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data: deliveryItems, error } = await query;
    if (error) return NextResponse.json({ success: false, error: error.message });

    // Enrich each item with image, recipient, and customer email
    const enriched = await Promise.all(
      (deliveryItems || []).map(async (item) => {
        let customerEmail: string | null = null;
        let imageUrl: string | null = null;
        let imagePrompt: string | null = null;
        let recipientName: string | null = null;
        let inmateNumber: string | null = null;
        let facility: string | null = null;
        let state: string | null = null;

        // Get order → customer email + image
        if (item.order_id) {
          const { data: order } = await supabase
            .from("orders")
            .select("customer_email, order_items(generated_images(image_url, prompt))")
            .eq("id", item.order_id)
            .single();

          if (order) {
            customerEmail = order.customer_email || null;
            const orderItems = (order as any).order_items;
            if (Array.isArray(orderItems) && orderItems.length > 0) {
              const img = orderItems[0]?.generated_images;
              if (img) {
                const imgObj = Array.isArray(img) ? img[0] : img;
                imageUrl = imgObj?.image_url || null;
                imagePrompt = imgObj?.prompt || null;
              }
            }
          }
        }

        // Get recipient from recipients table
        if (item.recipient_id) {
          const { data: recipient } = await supabase
            .from("recipients")
            .select("first_name, last_name, offender_id, facility, state")
            .eq("id", item.recipient_id)
            .single();

          if (recipient) {
            recipientName = [recipient.first_name, recipient.last_name].filter(Boolean).join(" ") || null;
            inmateNumber = recipient.offender_id || null;
            facility = recipient.facility || null;
            state = recipient.state || null;
          }
        }

        return {
          ...item,
          customerEmail,
          imageUrl,
          imagePrompt,
          recipientName,
          inmateNumber,
          facility,
          state,
        };
      })
    );

    return NextResponse.json({ success: true, items: enriched });
  } catch {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
