import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

function getServerSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

const steps = [
  { n: "1", title: "Browse the Catalog", body: "Choose from thousands of reviewed, approved images across 35 categories." },
  { n: "2", title: "Enter Your Recipient", body: "Add the inmate's name, ID number, and facility. We handle the rest." },
  { n: "3", title: "Pay $1.99", body: "Secure checkout via Stripe. One flat fee per image, no subscriptions required." },
  { n: "4", title: "Image Delivered", body: "We send the image directly to your recipient's facility account." },
];

export default async function Home() {
  const supabase = getServerSupabase();

  // Categories + one preview image per category in a single query
  const { data: categories } = await supabase
    .from("categories")
    .select("name,slug")
    .eq("is_active", true)
    .order("name");

  // One approved image per category for preview thumbnails
  const slugs = (categories || []).map((c) => c.slug);
  const { data: previewImages } = slugs.length
    ? await supabase
        .from("generated_images")
        .select("category_slug,image_url")
        .eq("status", "approved")
        .in("category_slug", slugs)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Pick first image per category
  const thumbMap: Record<string, string> = {};
  for (const img of previewImages || []) {
    if (img.category_slug && !thumbMap[img.category_slug]) {
      thumbMap[img.category_slug] = img.image_url;
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            Friends Behind Bars
          </p>
          <h1 className="text-5xl font-black leading-tight md:text-7xl">
            Send photos to incarcerated loved ones — for&nbsp;$1.99.
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-zinc-300">
            Browse our approved image catalog, enter your recipient's info, and we'll deliver the image directly to their facility. Simple, fast, reviewed.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/catalog" className="rounded-xl bg-white px-6 py-3 font-black text-black hover:bg-amber-300">
              Browse Catalog
            </Link>
            <Link href="/how-it-works" className="rounded-xl border border-zinc-600 px-6 py-3 font-black text-white hover:border-amber-400">
              How It Works
            </Link>
            <Link href="/signup" className="rounded-xl border border-amber-500 px-6 py-3 font-black text-amber-300 hover:bg-amber-500 hover:text-black">
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="bg-zinc-900 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">Simple Process</p>
          <h2 className="mt-3 text-4xl font-black">How it works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.n} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-lg font-black text-black">
                  {step.n}
                </span>
                <h3 className="mt-4 text-lg font-black">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category grid ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">35 Categories</p>
            <h2 className="mt-3 text-4xl font-black">Browse by Category</h2>
          </div>
          <Link href="/catalog" className="rounded-xl border border-zinc-700 px-5 py-3 font-bold hover:border-amber-400">
            View Full Catalog →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(categories || []).map((category) => {
            const thumb = thumbMap[category.slug];
            return (
              <Link
                key={category.slug}
                href={`/catalog?category=${category.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-lg transition hover:border-amber-400"
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
                    <div className="flex h-full items-center justify-center text-zinc-600 text-sm">No preview</div>
                  )}
                </div>
                {/* Label */}
                <div className="p-4">
                  <h3 className="font-black text-white group-hover:text-amber-300 transition">{category.name}</h3>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="bg-zinc-900 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-black">Ready to send your first image?</h2>
          <p className="mt-4 text-lg text-zinc-400">Create a free account, browse the catalog, and send an image for $1.99.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="rounded-xl bg-white px-8 py-3 font-black text-black hover:bg-amber-300">
              Get Started Free
            </Link>
            <Link href="/catalog" className="rounded-xl border border-zinc-600 px-8 py-3 font-black text-white hover:border-amber-400">
              Browse Catalog
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
