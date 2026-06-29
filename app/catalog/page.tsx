export const metadata = {
  title: "Catalog",
  description: "Browse thousands of approved images across 35 categories — animals, anime, classic cars, sports, and more. Each image $1.99, delivered to your recipient's facility.",
};

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import CatalogImageCard from "@/components/catalog/CatalogImageCard";

const PAGE_SIZE = 96;

function getServerSupabase() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return createClient(url, key);
}

type CatalogImage = {
  id: string;
  prompt: string;
  image_url: string | null;
  created_at: string;
  category_slug: string | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; page?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedCategory = resolvedSearchParams?.category || "";
  const page = Math.max(1, parseInt(resolvedSearchParams?.page || "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = getServerSupabase();

  const { data: categories } = await supabase
    .from("categories")
    .select("id,name,slug")
    .eq("is_active", true)
    .order("name");

  const selectedCategoryRecord = (categories || []).find(
    (category: Category) => category.slug === selectedCategory
  );

  // Build base query for count + paged fetch
  let countQuery = supabase
    .from("generated_images")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");

  let dataQuery = supabase
    .from("generated_images")
    .select("id,prompt,image_url,created_at,category_slug")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (selectedCategory) {
    countQuery = countQuery.eq("category_slug", selectedCategory);
    dataQuery = dataQuery.eq("category_slug", selectedCategory);
  }

  const [{ count: totalCount }, { data: images, error }] = await Promise.all([
    countQuery,
    dataQuery,
  ]);

  const total = totalCount || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Build pagination href helper — preserves category param
  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (selectedCategory) params.set("category", selectedCategory);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/catalog${qs ? `?${qs}` : ""}`;
  }

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
                : selectedCategory
                ? selectedCategory
                : "Approved Image Collections"}
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
                <Link
                  href="/categories"
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 hover:border-amber-400 hover:text-amber-300"
                >
                  Back to Categories
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
        {!selectedCategory && categories && categories.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/catalog"
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black"
            >
              All
            </Link>
            {categories.map((category: Category) => (
              <Link
                key={category.id}
                href={`/catalog?category=${encodeURIComponent(category.slug)}`}
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 hover:border-amber-400 hover:text-amber-300"
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}

        {/* Pagination context */}
        {totalPages > 1 && (
          <p className="mt-6 text-sm text-zinc-500">
            Page {page} of {totalPages} · {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()} images
          </p>
        )}

        {error && (
          <div className="mt-10 rounded-2xl border border-red-900 bg-red-950 p-6 text-red-200">
            Error loading catalog: {error.message}
          </div>
        )}

        {!images || images.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-900 p-10">
            <h2 className="text-2xl font-bold">
              {selectedCategory ? "No images in this category yet" : "No approved images yet"}
            </h2>
            <p className="mt-3 max-w-xl text-zinc-400">
              {selectedCategory
                ? "Approved images will appear here after they are assigned to this category."
                : "Approved catalog items from the admin review system will appear here."}
            </p>
          </div>
        ) : (
          <div className="mt-12 columns-1 gap-7 sm:columns-2 lg:columns-3 xl:columns-4">
            {images.map((image: CatalogImage) => (
              <div
                key={image.id}
                className="mb-7 break-inside-avoid overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/30"
              >
                <CatalogImageCard id={image.id} image_url={image.image_url} prompt={image.prompt} />
                <div className="p-5">
                  <p className="line-clamp-4 text-sm leading-6 text-zinc-400">
                    {image.prompt}
                  </p>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-400">
                      Approved
                    </span>
                    <Link
                      href={`/order?imageId=${encodeURIComponent(image.id)}`}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-black hover:bg-amber-300"
                    >
                      Select
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
            {page > 1 && (
              <Link
                href={pageHref(page - 1)}
                className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-200 hover:border-amber-400 hover:text-amber-300"
              >
                ← Previous
              </Link>
            )}

            {/* Page number buttons — show at most 7: first, last, current ±2, and ellipsis */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalPages <= 7) return true;
                return p === 1 || p === totalPages || Math.abs(p - page) <= 2;
              })
              .reduce<(number | "...")[]>((acc, p, i, arr) => {
                if (i > 0 && typeof arr[i - 1] === "number" && (p as number) - (arr[i - 1] as number) > 1) {
                  acc.push("...");
                }
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-zinc-600">…</span>
                ) : (
                  <Link
                    key={p}
                    href={pageHref(p as number)}
                    className={`rounded-xl px-4 py-3 text-sm font-bold ${
                      p === page
                        ? "bg-amber-400 text-black"
                        : "border border-zinc-700 text-zinc-200 hover:border-amber-400 hover:text-amber-300"
                    }`}
                  >
                    {p}
                  </Link>
                )
              )}

            {page < totalPages && (
              <Link
                href={pageHref(page + 1)}
                className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-200 hover:border-amber-400 hover:text-amber-300"
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
