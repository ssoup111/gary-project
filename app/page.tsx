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

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
          JPIX
        </p>

        <h1 className="max-w-4xl text-5xl font-bold leading-tight md:text-7xl">
          AI-generated image collections, reviewed and approved before release.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
          JPIX is a modern platform for creating, reviewing, organizing, and delivering approved digital image collections.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/categories" className="rounded-xl bg-white px-6 py-3 font-bold text-black">
            Browse Categories
          </Link>

          <Link href="/admin" className="rounded-xl border border-zinc-600 px-6 py-3 font-bold text-white">
            Admin Review
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="mb-6 text-3xl font-bold">Starting Categories</h2>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/catalog?category=${category.slug}`}
              className="block rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg transition hover:border-amber-400 hover:bg-zinc-800"
            >
              <h3 className="text-xl font-bold">{category.name}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Approved images for the {category.name.toLowerCase()} collection.
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
