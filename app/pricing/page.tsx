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
    <main className="min-h-screen bg-zinc-950 text-white">

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">Simple, Affordable Pricing</p>
        <h1 className="mt-4 text-5xl font-black md:text-6xl">Send love — not hassle.</h1>
        <p className="mx-auto mt-6 max-w-2xl text-xl leading-8 text-zinc-400">
          From a single photo to a full year of daily images, we have a plan that fits your budget.
          Every image reviewed, approved, and delivered to your recipient's facility.
        </p>
      </section>

      {/* Individual */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-3xl font-black">Individual Images</h2>
        <p className="mt-2 text-zinc-400">Good for one-offs or trying it out.</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {individual.map((plan: Plan) => (
            <div key={plan.id} className="relative rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
              {plan.badge && (
                <span className="absolute right-5 top-5 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-black">{plan.badge}</span>
              )}
              <p className="text-lg font-black">{plan.name}</p>
              <p className="mt-1 text-sm text-zinc-400">{plan.description}</p>
              <p className="mt-6 text-4xl font-black">${(plan.price_cents / 100).toFixed(2)}</p>
              <p className="mt-1 text-sm text-zinc-500">${(perImageCents(plan) / 100).toFixed(2)} per image</p>
              {plan.savings_pct && (
                <p className="mt-2 text-sm font-bold text-green-400">Save {plan.savings_pct}% vs buying one at a time</p>
              )}
              <Link href={`/order?plan=${plan.slug}`} className="mt-8 block rounded-2xl bg-white py-3 text-center font-black text-black hover:bg-amber-300">
                Get Started →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Packages */}
      <section className="bg-zinc-900 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-black">Image Packages</h2>
          <p className="mt-2 text-zinc-400">Buy a bundle and send images whenever you want — credits never expire.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((plan: Plan) => (
              <div key={plan.id} className={"relative flex flex-col rounded-3xl border p-6 " + (plan.badge === "Popular" ? "border-amber-400 bg-zinc-800" : plan.badge === "Best Value" ? "border-green-400 bg-zinc-800" : "border-zinc-800 bg-zinc-950")}>
                {plan.badge && (
                  <span className={"absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-black " + (plan.badge === "Best Value" ? "bg-green-400 text-black" : "bg-amber-400 text-black")}>{plan.badge}</span>
                )}
                <p className="text-lg font-black">{plan.name}</p>
                <p className="mt-1 text-xs text-zinc-400">{plan.description}</p>
                <p className="mt-5 text-3xl font-black">${(plan.price_cents / 100).toFixed(2)}</p>
                <p className="text-xs text-zinc-500">${(perImageCents(plan) / 100).toFixed(2)}/image</p>
                {plan.savings_pct && (
                  <p className="mt-2 text-xs font-bold text-green-400">Save {plan.savings_pct}%</p>
                )}
                <Link href={`/order?plan=${plan.slug}`} className={"mt-auto pt-6 block rounded-2xl py-3 text-center text-sm font-black " + (plan.badge ? "bg-white text-black hover:bg-amber-300" : "border border-zinc-700 text-white hover:border-amber-400")}>
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
        <p className="mt-2 text-zinc-400">1 new image delivered to your recipient every day. Set it and forget it.</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {subs.map((plan: Plan) => {
            const perDay = (plan.price_cents / (plan.duration_days || 30) / 100).toFixed(2);
            return (
              <div key={plan.id} className={"relative flex flex-col rounded-3xl border p-6 " + (plan.badge === "Popular" ? "border-amber-400 bg-zinc-800" : plan.badge === "Best Value" ? "border-green-400 bg-zinc-800" : "border-zinc-800 bg-zinc-900")}>
                {plan.badge && (
                  <span className={"absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-black " + (plan.badge === "Best Value" ? "bg-green-400 text-black" : "bg-amber-400 text-black")}>{plan.badge}</span>
                )}
                <p className="text-lg font-black">{plan.name}</p>
                <p className="mt-1 text-xs text-zinc-400">{plan.image_count} images total</p>
                <p className="mt-5 text-3xl font-black">${(plan.price_cents / 100).toFixed(2)}</p>
                <p className="text-xs text-zinc-500">${perDay}/day</p>
                <p className="mt-2 text-xs font-bold text-green-400">1 image delivered daily</p>
                <Link href={`/order?plan=${plan.slug}`} className={"mt-auto pt-6 block rounded-2xl py-3 text-center text-sm font-black " + (plan.badge ? "bg-white text-black hover:bg-amber-300" : "border border-zinc-700 text-white hover:border-amber-400")}>
                  Start Subscription →
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-zinc-900 px-6 py-20">
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
              <div key={q} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="font-black text-white">{q}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-4xl font-black">Ready to get started?</h2>
        <p className="mt-4 text-zinc-400">Browse the catalog and place your first order in minutes.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/catalog" className="rounded-2xl bg-white px-8 py-4 font-black text-black hover:bg-amber-300">Browse Catalog →</Link>
          <Link href="/signup" className="rounded-2xl border border-zinc-600 px-8 py-4 font-black text-white hover:border-amber-400">Create Free Account</Link>
        </div>
      </section>

    </main>
  );
}
