export const metadata = {
  title: "Categories — Friends Behind Bars",
  description: "Browse 35 approved image categories. Choose animals, anime, classic cars, sports, and more — all reviewed for incarcerated recipients.",
};

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

function getServerSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

type Category = { id: string; name: string; slug: string };

export default async function CategoriesPage() {
  const supabase = getServerSupabase();

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id,name,slug")
    .eq("is_active", true)
    .order("name");

  // One thumbnail + count per category
  const slugs = (categories || []).map((c) => c.slug);

  const [{ data: previewImages }, { data: counts }] = await Promise.all([
    slugs.length
      ? supabase
          .from("generated_images")
          .select("category_slug,image_url")
          .eq("status", "approved")
          .in("category_slug", slugs)
          .not("image_url", "is", null)
          .order("created_at", { ascending: false })
      : { data: [] },
    slugs.length
      ? supabase
          .from("generated_images")
          .select("category_slug")
          .eq("status", "approved")
          .in("category_slug", slugs)
      : { data: [] },
  ]);

  // Build thumb map
  const thumbMap: Record<string, string> = {};
  for (const img of previewImages || []) {
    if (img.category_slug && !thumbMap[img.category_slug]) {
      thumbMap[img.category_slug] = img.image_url;
    }
  }

  // Build count map
  const countMap: Record<string, number> = {};
  for (const row of counts || []) {
    if (row.category_slug) countMap[row.category_slug] = (countMap[row.category_slug] || 0) + 1;
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">Friends Behind Bars</p>
            <h1 className="mt-4 text-5xl font-black">Browse Categories</h1>
            <p className="mt-4 max-w-2xl text-zinc-400">
              35 curated collections, all reviewed and approved for incarcerated recipients.
            </p>
          </div>
          <Link href="/catalog" className="rounded-2xl bg-white px-5 py-3 font-bold text-black hover:bg-amber-300">
            View Full Catalog
          </Link>
        </div>

        {error && (
          <p className="mt-6 rounded-xl bg-red-950 p-4 text-red-200">Error loading categories: {error.message}</p>
        )}

        {!categories || categories.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
            <h2 className="text-2xl font-bold">No active categories yet</h2>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category: Category) => {
              const thumb = thumbMap[category.slug];
              const count = countMap[category.slug] || 0;
              return (
                <Link
                  key={category.id}
                  href={`/catalog?category=${encodeURIComponent(category.slug)}`}
                  className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-lg transition hover:border-amber-400"
                >
                  {/* Thumbnail */}
                  <div className="h-44 w-full overflow-hidden bg-zinc-800">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={category.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105 group-hover:opacity-80"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-600">No preview</div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex items-center justify-between p-4">
                    <h2 className="font-black text-white group-hover:text-amber-300 transition">{category.name}</h2>
                    {count > 0 && (
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-bold text-zinc-400">
                        {count}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
