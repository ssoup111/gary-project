import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ success: false, error: "Supabase not configured." }, { status: 500 });
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { imageUrl, description, source, photographer, categoryId } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: "Image URL is required." }, { status: 400 });
    }

    // Download the image from the stock photo service
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      return NextResponse.json({ success: false, error: "Failed to download image." }, { status: 500 });
    }

    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    const contentType = imageRes.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const fileName = `stock/${Date.now()}-${source}.${ext}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("jpix-generated")
      .upload(fileName, imageBuffer, { contentType, upsert: false });

    if (uploadError) {
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("jpix-generated")
      .getPublicUrl(fileName);

    const prompt = `${description} (${source} photo by ${photographer})`;

    const { error: insertError } = await supabaseAdmin
      .from("generated_images")
      .insert({
        category_id: categoryId || null,
        prompt,
        image_url: publicUrlData.publicUrl,
        status: "pending_review",
      });

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Stock import error:", error);
    return NextResponse.json({ success: false, error: "Import failed." }, { status: 500 });
  }
}
