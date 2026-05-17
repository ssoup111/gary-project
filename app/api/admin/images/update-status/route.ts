import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { imageId, status } = await req.json();

    if (!imageId || !status) {
      return NextResponse.json(
        { success: false, error: "Image ID and status are required." },
        { status: 400 }
      );
    }

    if (!["approved", "rejected", "archived", "pending_review"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status." },
        { status: 400 }
      );
    }

    const updateData =
      status === "approved"
        ? { status, approved_at: new Date().toISOString() }
        : { status };

    const { error } = await supabaseAdmin
      .from("generated_images")
      .update(updateData)
      .eq("id", imageId);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update image status error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to update image status." },
      { status: 500 }
    );
  }
}
