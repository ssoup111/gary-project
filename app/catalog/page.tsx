export const metadata = { title: "Catalog" };

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// Use server-only env vars (no NEXT_PUBLIC_ prefix) so the URL is read at
// runtime rather than being baked into the bundle at build time.
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
  searchParams?: Promise<{ category?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedCategory = resolvedSearchParams?.category || "";

  const supabase = getServerSupabase();

  const { data: categories } = await supabase
    .from("categories")
    .select("id,name,slug")
    .eq("is_active", true)
    .order("name");

  const selectedCategoryRecord = (categories || []).find(
    (category: Category) => category.slug === selectedCategory
  );

  let query = supabase
    .from("generated_images")
    .select("id,prompt,image_url,created_at,category_slug")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (selectedCategory) {
    query = query.eq("category_slug", selectedCategory);
  }

  const { data: images, error } = await query;

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
                ? "Browse approved AI-generated images assigned to this category."
                : "Browse approved AI-generated catalog images available for subscriptions, packages, and incarcerated-recipient delivery."}
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
              Approved Images
            </p>

            <p className="mt-2 text-4xl font-black">{images?.length || 0}</p>
          </div>
        </div>

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
                {image.image_url && (
                  <Link
                    href={`/catalog/${encodeURIComponent(image.id)}`}
                    className="block cursor-pointer bg-black"
                  >
                    <img
                      src={image.image_url}
                      alt={image.prompt}
                      className="w-full object-contain bg-black"
                    />
                  </Link>
                )}

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
                      className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-black"
                    >
                      Select
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
