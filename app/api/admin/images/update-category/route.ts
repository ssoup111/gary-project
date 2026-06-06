import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured." },
        { status: 500 }
      );
    }

    // Verify admin
    const authHeader = req.headers.get("authorization");
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!authHeader || !adminEmail) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabaseAuth.auth.getUser();
    if (!userData.user || userData.user.email !== adminEmail) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { imageId, categorySlug } = await req.json();

    const { error } = await supabase
      .from("generated_images")
      .update({ category_slug: categorySlug || null })
      .eq("id", imageId);

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
