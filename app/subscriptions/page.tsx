"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<ProductPlan[]>([]);
  const [status, setStatus] = useState("");

  async function loadPlans() {
    const { data } = await supabase
      .from("product_plans")
      .select("id,name,slug,plan_type,access_level,image_count,price_cents,description")
      .eq("is_active", true)
      .order("price_cents");

    setPlans(data || []);
  }

  useEffect(() => {
    loadPlans();
  }, []);

  async function selectPlan(planId: string) {
    setStatus("Opening Stripe checkout...");

    const response = await fetch("/api/create-plan-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ planId }),
    });

    const result = await response.json();

    if (!result.success || !result.url) {
      setStatus(result.error || "Checkout failed.");
      return;
    }

    window.location.href = result.url;
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-5xl font-black">Plans & Packs</h1>

        <p className="mt-4 max-w-2xl text-zinc-400">
          Single images, image packs, and monthly subscription options for JPIX.
        </p>

        {status && (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
            {status}
          </div>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-3xl border border-zinc-800 bg-zinc-900 p-7">
              <p className="text-sm font-bold uppercase tracking-widest text-amber-400">
                {plan.plan_type}
              </p>

              <h2 className="mt-3 text-3xl font-black">{plan.name}</h2>

              <p className="mt-5 text-5xl font-black">
                ${(plan.price_cents / 100).toFixed(2)}
              </p>

              <p className="mt-4 text-zinc-400">
                {plan.description || `${plan.image_count} image${plan.image_count === 1 ? "" : "s"}`}
              </p>

              <p className="mt-2 text-zinc-400">
                Access: {plan.access_level}
              </p>

              <button
                type="button"
                onClick={() => selectPlan(plan.id)}
                className="mt-7 w-full cursor-pointer rounded-2xl bg-white px-5 py-3 font-black text-black"
              >
                Select Plan
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
