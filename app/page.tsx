export const metadata = {
  title: "Friends Behind Bars — Send Photos to Incarcerated Loved Ones",
  description: "Browse approved image collections and send photos directly to incarcerated recipients for $0.99. 35 categories, reviewed and safe.",
};

import { createClient } from "@supabase/supabase-js";
import HomeStoreGrid from "@/components/home/HomeStoreGrid";

const PAGE_SIZE = 96;

function getServerSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

export default async function Home() {
  const supabase = getServerSupabase();

  // Newest-approved images first, shown directly below the nav.
  const { data: images } = await supabase
    .from("generated_images")
    .select("id,prompt,image_url,created_at,category_slug")
    .eq("status", "approved")
    .not("image_url", "is", null)
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  const initialImages = images || [];
  const initialHasMore = initialImages.length === PAGE_SIZE;

  return (
    <main className="min-h-screen bg-white">
      <HomeStoreGrid initialImages={initialImages} initialHasMore={initialHasMore} />
    </main>
  );
}
