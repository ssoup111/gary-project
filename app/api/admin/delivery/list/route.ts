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
        const images: {
          itemId: string;
          url: string;
          prompt: string;
          category: string;
          source: string;
          deliveredAt: string | null;
        }[] = [];
        let recipientName: string | null = null;
        let inmateNumber: string | null = null;
        let facility: string | null = null;
        let state: string | null = null;

        // Get order -> customer email + EVERY picture on it.
        // A cart order can carry dozens; sending only the first one back
        // meant a 52-picture job showed a single image.
        if (item.order_id) {
          const { data: order } = await supabase
            .from("orders")
            .select("customer_email")
            .eq("id", item.order_id)
            .single();
          if (order) customerEmail = order.customer_email || null;

          const { data: rows } = await supabase
            .from("order_items")
            .select("id, source, delivered_at, generated_images(image_url, prompt, category_slug)")
            .eq("order_id", item.order_id)
            .order("source", { ascending: true })
            .order("created_at", { ascending: true });

          for (const row of rows || []) {
            const raw = (row as unknown as { generated_images: unknown }).generated_images;
            const img = (Array.isArray(raw) ? raw[0] : raw) as
              | { image_url?: string; prompt?: string; category_slug?: string }
              | null;
            if (!img?.image_url) continue;
            images.push({
              itemId: (row as unknown as { id: string }).id,
              url: img.image_url,
              prompt: img.prompt || "",
              category: img.category_slug || "",
              source: (row as unknown as { source: string }).source || "individual",
              deliveredAt: (row as unknown as { delivered_at: string | null }).delivered_at,
            });
          }

          // Keep the old single-image fields pointing at the first picture,
          // so the card still has a thumbnail.
          imageUrl = images[0]?.url ?? null;
          imagePrompt = images[0]?.prompt ?? null;
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
          images,
          imageCount: images.length,
          deliveredCount: images.filter((i) => i.deliveredAt).length,
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
