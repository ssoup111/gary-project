export const metadata = {
  title: "Friends Behind Bars — Send Photos to Incarcerated Loved Ones",
  description: "Browse approved image collections and send photos directly to incarcerated recipients for $0.99. 35 categories, reviewed and safe.",
};

import Link from "next/link";
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
    <main className="min-h-screen bg-[#FAF8F5]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0A3161] to-[#0a2449] px-6 py-20 text-white sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/70">Friends Behind Bars</p>
          <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
            Stay connected, one photo at a time.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/85">
            Send a reviewed, facility-approved photo directly to an incarcerated loved one for $0.99 —
            no letters, no waiting on the mail. Just a simple way to say you're thinking of them.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#catalog"
              className="rounded-xl bg-[#9C2B44] px-8 py-3 font-black text-white shadow-lg shadow-black/20 transition hover:bg-[#7A2036]"
            >
              Browse the Catalog
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
      <section className="border-b border-black/10 bg-white px-6 py-10">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 sm:grid-cols-4">
          {[
            {
              label: "Facility-Approved",
              text: "Every image is reviewed before it's eligible to send.",
              icon: (
                <path d="M12 3l7 3v6c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
              ),
            },
            {
              label: "Reviewed by Our Team",
              text: "Nothing reaches the catalog without a manual check.",
              icon: (
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              ),
            },
            {
              label: "Works with Securus & JPay",
              text: "Delivered straight to their facility tablet account.",
              icon: (
                <path d="M8 12h8M8 8h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              ),
            },
            {
              label: "1–2 Day Delivery",
              text: "Fast turnaround once your payment is confirmed.",
              icon: (
                <>
                  <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" fill="none" />
                  <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                </>
              ),
            },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#9C2B44]/10 text-[#9C2B44]">
                <svg viewBox="0 0 24 24" className="h-5 w-5">{item.icon}</svg>
              </span>
              <p className="mt-3 text-sm font-black text-[#0A3161]">{item.label}</p>
              <p className="mt-1 text-xs leading-5 text-[#0A3161]/68">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <div id="catalog">
        <HomeStoreGrid initialImages={initialImages} initialHasMore={initialHasMore} />
      </div>
    </main>
  );
}
