import Link from "next/link";

const categories = [
  { name: "Female Models", slug: "female-models" },
  { name: "Male Models", slug: "male-models" },
  { name: "Cars & Motorcycles", slug: "cars-motorcycles" },
  { name: "Sports", slug: "sports" },
  { name: "Seasonal", slug: "seasonal" },
  { name: "Faith", slug: "faith" },
  { name: "Military", slug: "military" },
  { name: "Animals", slug: "animals" },
  { name: "Nature", slug: "nature" },
  { name: "Inspirational", slug: "inspirational" },
];

const features = [
  "Reviewed image collections",
  "Saved recipient profiles",
  "Single-image ordering",
  "Subscription-ready platform",
  "Adult-only content rules",
  "Admin approval workflow",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Friends Behind Bars
            </p>
            <h1 className="max-w-5xl text-5xl font-black leading-tight md:text-7xl">
              Approved digital image collections for people behind bars.
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-zinc-200">
              Browse safe, reviewed image collections, save recipient profiles, and prepare image orders through a simple customer dashboard.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/catalog" className="rounded-xl bg-white px-6 py-3 font-black text-black">Browse Catalog</Link>
              <Link href="/how-it-works" className="rounded-xl border border-zinc-600 px-6 py-3 font-black text-white hover:border-amber-400">How It Works</Link>
              <Link href="/signup" className="rounded-xl border border-amber-500 px-6 py-3 font-black text-amber-300 hover:bg-amber-500 hover:text-black">Create Account</Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900 p-8 shadow-2xl shadow-black/40">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">Platform Features</p>
            <div className="mt-6 grid gap-3">
              {features.map((feature) => (
                <div key={feature} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-base font-bold text-zinc-100">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">Catalog</p>
            <h2 className="mt-3 text-4xl font-black">Starting Categories</h2>
          </div>
          <Link href="/categories" className="rounded-xl border border-zinc-700 px-5 py-3 font-bold hover:border-amber-400">View All Categories</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link key={category.slug} href={`/catalog?category=${category.slug}`} className="block rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg transition hover:border-amber-400 hover:bg-zinc-800">
              <h3 className="text-xl font-bold text-white">{category.name}</h3>
              <p className="mt-3 text-base leading-7 text-zinc-300">
                Browse approved images for the {category.name.toLowerCase()} collection.
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}