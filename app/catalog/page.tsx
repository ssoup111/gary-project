export const metadata = {
  title: "Catalog",
  description: "Browse thousands of approved images across 35 categories — animals, anime, classic cars, sports, and more. Each image $1.99, delivered to your recipient's facility.",
};

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import CatalogInfiniteScroll from "@/components/catalog/CatalogInfiniteScroll";

const PAGE_SIZE = 96;

function getServerSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

type Category = { id: string; name: string; slug: string };
type CatalogImage = { id: string; prompt: string; image_url: string | null; created_at: string; category_slug: string | null };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const selectedCategory = resolvedParams?.category || "";

  const supabase = getServerSupabase();

  // Fetch categories
  const { data: categories } = await supabase
    .from("categories")
    .select("id,name,slug")
    .eq("is_active", true)
    .order("name");

  // Count query
  let countQuery = supabase
    .from("generated_images")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");
  if (selectedCategory) countQuery = countQuery.eq("category_slug", selectedCategory);

  // Data query — first page only; client handles the rest
  let dataQuery = supabase
    .from("generated_images")
    .select("id,prompt,image_url,created_at,category_slug")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);
  if (selectedCategory) dataQuery = dataQuery.eq("category_slug", selectedCategory);

  const [{ count }, { data: images }] = await Promise.all([countQuery, dataQuery]);

  const total = count || 0;
  const initialImages: CatalogImage[] = images || [];
  const initialHasMore = initialImages.length === PAGE_SIZE;

  const selectedCategoryRecord = (categories || []).find(
    (c: Category) => c.slug === selectedCategory
  );

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
              Friends Behind Bars Catalog
            </p>
            <h1 className="mt-4 text-5xl font-black">
              {selectedCategoryRecord
                ? selectedCategoryRecord.name
                : selectedCategory || "Approved Image Collections"}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-400">
              {selectedCategory
                ? "Browse approved images in this category."
                : "Browse approved catalog images — $1.99 each, delivered to your recipient's facility."}
            </p>
            {selectedCategory && (
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/catalog"
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 hover:border-amber-400 hover:text-amber-300"
                >
                  Clear Category
                </Link>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4">
            <p className="text-sm uppercase tracking-widest text-zinc-500">
              {selectedCategory ? "In Category" : "Approved Images"}
            </p>
            <p className="mt-2 text-4xl font-black">{total.toLocaleString()}</p>
          </div>
        </div>

        {/* Category filter pills */}
        {categories && categories.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/catalog"
              className={
                "rounded-full px-4 py-2 text-sm font-bold " +
                (!selectedCategory
                  ? "bg-white text-black"
                  : "border border-zinc-700 text-zinc-200 hover:border-amber-400 hover:text-amber-300")
              }
            >
              All
            </Link>
            {(categories as Category[]).map((cat) => (
              <Link
                key={cat.id}
                href={`/catalog?category=${encodeURIComponent(cat.slug)}`}
                className={
                  "rounded-full px-4 py-2 text-sm font-bold " +
                  (selectedCategory === cat.slug
                    ? "bg-amber-400 text-black"
                    : "border border-zinc-700 text-zinc-200 hover:border-amber-400 hover:text-amber-300")
                }
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {initialImages.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-900 p-10">
            <h2 className="text-2xl font-bold">
              {selectedCategory ? "No images in this category yet" : "No approved images yet"}
            </h2>
            <p className="mt-3 max-w-xl text-zinc-400">
              {selectedCategory
                ? "Approved images will appear here once some are approved."
                : "Approved catalog items will appear here."}
            </p>
          </div>
        ) : (
          <CatalogInfiniteScroll
            initialImages={initialImages}
            initialHasMore={initialHasMore}
            category={selectedCategory}
            total={total}
          />
        )}
      </div>
    </main>
  );
}
