import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Category = {
  id: string;
  name: string;
  slug: string;
};

export default async function CategoriesPage() {
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id,name,slug")
    .eq("is_active", true)
    .order("name");

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
              Friends Behind Bars
            </p>

            <h1 className="mt-4 text-5xl font-black">Categories</h1>

            <p className="mt-4 max-w-2xl text-zinc-400">
              Choose a category to browse approved Friends Behind Bars catalog images.
            </p>
          </div>

          <Link
            href="/catalog"
            className="rounded-2xl bg-white px-5 py-3 font-bold text-black"
          >
            View Full Catalog
          </Link>
        </div>

        {error && (
          <p className="mt-6 rounded-xl bg-red-950 p-4 text-red-200">
            Error loading categories: {error.message}
          </p>
        )}

        {!categories || categories.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
            <h2 className="text-2xl font-bold">No active categories yet</h2>
            <p className="mt-3 text-zinc-400">
              Active categories from the Friends Behind Bars database will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category: Category) => (
              <Link
                key={category.id}
                href={`/catalog?category=${encodeURIComponent(category.slug)}`}
                className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:-translate-y-1 hover:border-amber-400 hover:bg-zinc-850 hover:shadow-2xl hover:shadow-amber-500/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold group-hover:text-amber-300">
                      {category.name}
                    </h2>

                    <p className="mt-3 text-sm text-zinc-400">
                      Browse approved images in this category.
                    </p>
                  </div>

                  <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase text-black">
                    Open
                  </span>
                </div>

                <p className="mt-5 text-xs uppercase tracking-widest text-zinc-500">
                  {category.slug}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
