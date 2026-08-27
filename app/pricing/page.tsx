import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const metadata = {
  title: "Pricing — Friends Behind Bars",
  description: "Affordable image packages and subscriptions for sending photos to incarcerated loved ones. Starting at $0.99.",
};

function getServerSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

type Plan = {
  id: string;
  name: string;
  slug: string;
  plan_type: string;
  description: string;
  image_count: number;
  price_cents: number;
  duration_days: number | null;
  badge: string | null;
  savings_pct: number | null;
  sort_order: number;
};

function perImageCents(plan: Plan) {
  return Math.round(plan.price_cents / plan.image_count);
}

export default async function PricingPage() {
  const supabase = getServerSupabase();
  const { data: plans } = await supabase
    .from("product_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  const individual = (plans || []).filter((p: Plan) => p.plan_type === "individual");
  const packages   = (plans || []).filter((p: Plan) => p.plan_type === "package");
  const subs       = (plans || []).filter((p: Plan) => p.plan_type === "subscription");

  return (
    <main className="min-h-screen bg-[#FAF8F5] text-[#0A3161]">

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-12 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#A6412B]">Simple, Affordable Pricing</p>
        <h1 className="mt-3 text-4xl font-black md:text-5xl">Send love — not hassle.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-[#0A3161]/78">
          From a single photo to a full year of daily images. Every image reviewed and delivered to your recipient's facility.
        </p>
      </section>

      {/* Individual */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-3xl font-black">Individual Images</h2>
        <p className="mt-2 text-[#0A3161]/78">Good for one-offs or trying it out.</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {individual.map((plan: Plan) => (
            <div key={plan.id} className="relative rounded-3xl border border-black/10 bg-white p-8">
              {plan.badge && (
                <span className="absolute right-5 top-5 rounded-full bg-[#A6412B] px-3 py-1 text-xs font-black text-white">{plan.badge}</span>
              )}
              <p className="text-lg font-black">{plan.name}</p>
              <p className="mt-1 text-sm text-[#0A3161]/78">{plan.description}</p>
              <p className="mt-6 text-4xl font-black">${(plan.price_cents / 100).toFixed(2)}</p>
              <p className="mt-1 text-sm text-[#0A3161]/72">${(perImageCents(plan) / 100).toFixed(2)} per image</p>
              {plan.savings_pct && (
                <p className="mt-2 text-sm font-bold text-amber-700">Save {plan.savings_pct}% vs buying one at a time</p>
              )}
              <Link href={`/order?plan=${plan.slug}`} className="mt-8 block rounded-2xl bg-[#A6412B] py-3 text-center font-black text-white hover:bg-[#8C3520]">
                Get Started →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Packages */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-black">Image Packages</h2>
          <p className="mt-2 text-[#0A3161]/78">Buy a bundle and send images whenever you want — credits never expire.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((plan: Plan) => (
              <div key={plan.id} className={"relative flex flex-col rounded-3xl border p-6 transition " + (plan.badge === "Popular" ? "border-[#A6412B] bg-[#F1F4F9] shadow-xl shadow-black/10 sm:scale-105" : plan.badge === "Best Value" ? "border-amber-400 bg-[#F1F4F9]" : "border-black/10 bg-white")}>
                {plan.badge && (
                  <span className={"absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-black " + (plan.badge === "Best Value" ? "bg-amber-400 text-black" : "bg-[#A6412B] text-white")}>{plan.badge}</span>
                )}
                <p className="text-lg font-black">{plan.name}</p>
                <p className="mt-1 text-xs text-[#0A3161]/78">{plan.description}</p>
                <p className="mt-5 text-3xl font-black">${(plan.price_cents / 100).toFixed(2)}</p>
                <p className="text-xs text-[#0A3161]/72">${(perImageCents(plan) / 100).toFixed(2)}/image</p>
                {plan.savings_pct && (
                  <p className="mt-2 text-xs font-bold text-amber-700">Save {plan.savings_pct}%</p>
                )}
                <p className="mt-3 text-xs text-[#0A3161]/68">Credits never expire · one recipient per pack</p>
                <Link href={`/order?plan=${plan.slug}`} className={"mt-auto pt-6 block rounded-2xl py-3 text-center text-sm font-black " + (plan.badge ? "bg-[#A6412B] text-white hover:bg-[#8C3520]" : "border border-black/12 text-[#0A3161] hover:border-[#A6412B]")}>
                  Buy Package →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscriptions */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-3xl font-black">Daily Subscriptions</h2>
        <p className="mt-2 text-[#0A3161]/78">1 new image delivered to your recipient every day. Set it and forget it.</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {subs.map((plan: Plan) => {
            const perDay = (plan.price_cents / (plan.duration_days || 30) / 100).toFixed(2);
            return (
              <div key={plan.id} className={"relative flex flex-col rounded-3xl border p-6 transition " + (plan.badge === "Popular" ? "border-[#A6412B] bg-[#F1F4F9] shadow-xl shadow-black/10 sm:scale-105" : plan.badge === "Best Value" ? "border-amber-400 bg-[#F1F4F9]" : "border-black/10 bg-white")}>
                {plan.badge && (
                  <span className={"absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-black " + (plan.badge === "Best Value" ? "bg-amber-400 text-black" : "bg-[#A6412B] text-white")}>{plan.badge}</span>
                )}
                <p className="text-lg font-black">{plan.name}</p>
                <p className="mt-1 text-xs text-[#0A3161]/78">{plan.image_count} images total</p>
                <p className="mt-5 text-3xl font-black">${(plan.price_cents / 100).toFixed(2)}</p>
                <p className="text-xs text-[#0A3161]/72">${perDay}/day</p>
                <p className="mt-2 text-xs font-bold text-amber-700">1 image delivered daily</p>
                <p className="mt-1 text-xs text-[#0A3161]/68">One recipient per subscription</p>
                <Link href={`/order?plan=${plan.slug}`} className={"mt-auto pt-6 block rounded-2xl py-3 text-center text-sm font-black " + (plan.badge ? "bg-[#A6412B] text-white hover:bg-[#8C3520]" : "border border-black/12 text-[#0A3161] hover:border-[#A6412B]")}>
                  Start Subscription →
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-black">Common Questions</h2>
          <div className="mt-8 space-y-6">
            {[
              { q: "Do package credits expire?", a: "No. Package credits never expire. Buy 50 images and use them at your own pace." },
              { q: "How does the daily subscription work?", a: "We send one approved image to your recipient every day for the duration of your plan. You choose the category, we handle the rest." },
              { q: "Can I send to multiple recipients?", a: "Each order is linked to one recipient. You can place multiple orders for different recipients." },
              { q: "What happens after I pay?", a: "Your order goes into our delivery queue. We deliver it to your recipient's facility account, usually within 24 hours." },
              { q: "Is there a free trial?", a: "Yes — your first single image is just $0.99. Try it risk-free." },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-2xl border border-black/10 bg-white p-6">
                <p className="font-black text-[#0A3161]">{q}</p>
                <p className="mt-2 text-sm leading-6 text-[#0A3161]/78">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-4xl font-black">Ready to get started?</h2>
        <p className="mt-4 text-[#0A3161]/78">Browse the catalog and place your first order in minutes.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/catalog" className="rounded-2xl bg-[#A6412B] px-8 py-4 font-black text-white hover:bg-[#8C3520]">Browse Catalog →</Link>
          <Link href="/signup" className="rounded-2xl border border-black/15 px-8 py-4 font-black text-[#0A3161] hover:border-[#A6412B]">Create Free Account</Link>
        </div>
      </section>

    </main>
  );
}
