"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type ProductPlan = {
  id: string;
  name: string;
  slug: string;
  plan_type: string;
  access_level: string;
  image_count: number;
  price_cents: number;
  description: string | null;
};

function SubscriptionsContent() {
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");

  const [plans, setPlans] = useState<ProductPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  async function loadPlans() {
    const { data } = await supabase
      .from("product_plans")
      .select("id,name,slug,plan_type,access_level,image_count,price_cents,description")
      .eq("is_active", true)
      .order("price_cents");
    setPlans(data || []);
    setLoading(false);
  }

  useEffect(() => { loadPlans(); }, []);

  async function selectPlan(planId: string) {
    setStatus("Opening Stripe checkout...");
    const response = await fetch("/api/create-plan-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    const result = await response.json();
    if (!result.success || !result.url) { setStatus(result.error || "Checkout failed."); return; }
    window.location.href = result.url;
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">Friends Behind Bars</p>
        <h1 className="mt-4 text-5xl font-black">Plans & Packs</h1>
        <p className="mt-4 max-w-2xl text-zinc-400">Single images, image packs, and monthly subscription options.</p>

        {paymentStatus === "success" && (
          <div className="mt-8 rounded-2xl border border-green-500/40 bg-green-500/10 p-5">
            <p className="text-lg font-black text-green-300">Payment successful!</p>
            <p className="mt-1 text-sm text-green-200/70">Your plan is now active. Check your dashboard to manage it.</p>
          </div>
        )}
        {paymentStatus === "cancelled" && (
          <div className="mt-8 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
            <p className="font-bold text-amber-300">Payment cancelled — no charge was made.</p>
          </div>
        )}

        {status && <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 font-bold text-amber-300">{status}</div>}
        {loading ? (
          <LoadingSpinner message="Loading plans..." />
        ) : plans.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-10">
            <p className="text-xl font-bold">No plans available yet.</p>
            <p className="mt-3 text-zinc-400">Check back soon or contact us for pricing.</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-3xl border border-zinc-800 bg-zinc-900 p-7">
                <p className="text-sm font-bold uppercase tracking-widest text-amber-400">{plan.plan_type}</p>
                <h2 className="mt-3 text-3xl font-black">{plan.name}</h2>
                <p className="mt-5 text-5xl font-black">${(plan.price_cents / 100).toFixed(2)}</p>
                <p className="mt-4 text-zinc-300">{plan.description || `${plan.image_count} image${plan.image_count === 1 ? "" : "s"}`}</p>
                <p className="mt-2 text-zinc-400">Access: {plan.access_level}</p>
                <button type="button" onClick={() => selectPlan(plan.id)} className="mt-7 w-full cursor-pointer rounded-2xl bg-white px-5 py-3 font-black text-black hover:bg-amber-300 transition">
                  Select Plan
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-zinc-950 px-6 py-16 text-white"><p className="text-zinc-400">Loading...</p></main>}>
      <SubscriptionsContent />
    </Suspense>
  );
}
