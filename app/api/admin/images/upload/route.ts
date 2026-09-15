import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";

const BUCKET = "jpix-generated";
const PREFIX = "uploads";
const MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ success: false, error: "Supabase is not configured." }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const form = await req.formData();
    const file = form.get("file");
    const categorySlug = String(form.get("categorySlug") || "").trim();
    const title = String(form.get("title") || "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "No file received." }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { success: false, error: `${file.type || "That file type"} isn't a supported image. Use JPG, PNG or WebP.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: `That image is ${(file.size / 1048576).toFixed(1)} MB. The limit is 8 MB.` },
        { status: 400 }
      );
    }

    // A category is required, otherwise the picture is invisible to the
    // catalog, which filters on category_slug.
    if (!categorySlug) {
      return NextResponse.json({ success: false, error: "Choose a category first." }, { status: 400 });
    }
    const { data: category } = await supabase
      .from("categories")
      .select("id, slug, name")
      .eq("slug", categorySlug)
      .single();
    if (!category) {
      return NextResponse.json({ success: false, error: "That category no longer exists." }, { status: 400 });
    }

    const ext = file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg";
    const key = `${PREFIX}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(key, buf, { contentType: file.type, upsert: false });
    if (upErr) {
      return NextResponse.json({ success: false, error: upErr.message }, { status: 500 });
    }

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;

    // Uploads land as pending_review like everything else, so an upload and
    // an approval stay two separate decisions.
    const { error: insErr } = await supabase.from("generated_images").insert({
      category_id: category.id,
      category_slug: category.slug,
      title: title || `${category.name} upload`,
      prompt: title || `Uploaded to ${category.name}`,
      image_url: publicUrl,
      status: "pending_review",
      tags: ["upload"],
      sell_price_cents: 99,
    });
    if (insErr) {
      return NextResponse.json({ success: false, error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, imageUrl: publicUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: "Upload failed." }, { status: 500 });
  }
}
