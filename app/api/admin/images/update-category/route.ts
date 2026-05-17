import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { imageId, categorySlug } = await req.json();

    const { error } = await supabase
      .from("generated_images")
      .update({
        category_slug: categorySlug || null,
      })
      .eq("id", imageId);

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: "Server error",
    });
  }
}
