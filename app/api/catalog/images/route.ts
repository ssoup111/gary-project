import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getServerSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

const PAGE_SIZE = 96;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "";
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

  const supabase = getServerSupabase();

  let query = supabase
    .from("generated_images")
    .select("id,prompt,image_url,created_at,category_slug")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (category) query = query.eq("category_slug", category);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ images: data || [], hasMore: (data || []).length === PAGE_SIZE });
}
