export const metadata = {
  title: "Friends Behind Bars — Send Photos to Incarcerated Loved Ones",
  description: "Browse approved image collections and send photos directly to incarcerated recipients for $0.99. 35 categories, reviewed and safe.",
};

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import HomeStoreGrid from "@/components/home/HomeStoreGrid";
import { SENSITIVE_HOME_CATEGORY_SLUGS } from "@/lib/sensitiveCategories";

const PAGE_SIZE = 96;

function getServerSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

export default async function Home() {
  const supabase = getServerSupabase();

  // Newest-approved images first, shown directly below the nav.
  // Glamour/lingerie-leaning categories are excluded from this lead feed —
  // still fully browsable in /catalog, just not the first thing visitors see.
  const { data: images } = await supabase
    .from("generated_images")
    .select("id,prompt,image_url,created_at,category_slug")
    .eq("status", "approved")
    .not("image_url", "is", null)
    .not("category_slug", "in", `(${SENSITIVE_HOME_CATEGORY_SLUGS.join(",")})`)
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  const initialImages = images || [];
  const initialHasMore = initialImages.length === PAGE_SIZE;

  return (
    <main className="min-h-screen bg-[#FAF8F5]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0A3161] to-[#0a2449] px-6 py-14 text-white sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">
            Stay connected, one photo at a time.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-7 text-white/85">
            A reviewed, facility-approved photo — delivered straight to their tablet.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#catalog"
              className="rounded-xl bg-[#A6412B] px-8 py-3 font-black text-white shadow-lg shadow-black/20 transition hover:bg-[#8C3520]"
            >
              Browse photos — $0.99
            </a>
            <Link
              href="/how-it-works"
              className="rounded-xl border border-white/30 px-8 py-3 font-black text-white transition hover:border-white/60"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-black/10 bg-white px-6 py-9">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                label: "Reviewed",
                text: "Every image is checked by our team before it's approved.",
                icon: (
                  <>
                    <path d="M12 3l7 3v6c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6l7-3z" stroke="#0A3161" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
                    <path d="M9 12.2l2 2 4-4.4" stroke="#A6412B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </>
                ),
              },
              {
                label: "Delivered to Tablet",
                text: "Sent directly to your recipient's facility account.",
                icon: (
                  <>
                    <rect x="6" y="3" width="12" height="18" rx="2.2" stroke="#0A3161" strokeWidth="1.6" fill="none" />
                    <path d="M10.5 18h3" stroke="#A6412B" strokeWidth="1.8" strokeLinecap="round" />
                  </>
                ),
              },
              {
                label: "$0.99 · 1–2 Day Delivery",
                text: "Simple pricing, fast turnaround once payment is confirmed.",
                icon: (
                  <>
                    <circle cx="12" cy="12" r="8" stroke="#0A3161" strokeWidth="1.6" fill="none" />
                    <path d="M12 7.5v4.8l3.2 2" stroke="#A6412B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  </>
                ),
              },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center text-center sm:items-start sm:text-left">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F1F4F9]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5">{item.icon}</svg>
                </span>
                <p className="mt-3 text-sm font-black text-[#0A3161]">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-[#0A3161]/68">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-7 text-center text-xs font-bold uppercase tracking-wider text-[#0A3161]/58">
            Works with Securus Snap &amp; Send and JPay facility tablets
          </p>
        </div>
      </section>

      <div id="catalog">
        <HomeStoreGrid initialImages={initialImages} initialHasMore={initialHasMore} />
      </div>
    </main>
  );
}
