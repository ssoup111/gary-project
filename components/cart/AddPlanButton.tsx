"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCart, type CartPlan } from "@/lib/cart";

type Category = { id: string; name: string; slug: string };

export default function AddPlanButton({ plan }: { plan: CartPlan }) {
  const { addPlan, hasPlan } = useCart();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!open || categories.length > 0) return;
    supabase
      .from("categories")
      .select("id,name,slug")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setCategories(data || []));
  }, [open, categories.length]);

  const alreadyInCart = hasPlan(plan.id, selected);

  function toggle(slug: string) {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function confirm() {
    if (selected.length === 0) return;
    addPlan(plan, selected);
    setJustAdded(true);
    setOpen(false);
    setSelected([]);
  }

  // How the plan's pictures divide across the chosen categories.
  const split = (() => {
    const n = selected.length;
    if (n === 0) return null;
    const base = Math.floor(plan.image_count / n);
    const remainder = plan.image_count % n;
    return selected.map((slug, i) => ({
      slug,
      count: base + (i < remainder ? 1 : 0),
    }));
  })();

  if (justAdded) {
    return (
      <div className="mt-8 space-y-3">
        <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#0A3161] bg-[#F1F4F9] py-3 font-black text-[#0A3161]">
          <svg viewBox="0 0 24 24" className="h-5 w-5">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          Added to Cart
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setJustAdded(false)}
            className="flex-1 rounded-2xl border border-black/12 py-3 text-sm font-bold hover:border-[#A6412B]"
          >
            Add Again
          </button>
          <Link
            href="/cart"
            className="flex-1 rounded-2xl bg-[#A6412B] py-3 text-center text-sm font-black text-white hover:bg-[#8C3520]"
          >
            View Cart →
          </Link>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-8 block w-full rounded-2xl bg-[#A6412B] py-3 text-center font-black text-white hover:bg-[#8C3520]"
      >
        Choose Categories →
      </button>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border-2 border-[#0A3161]/15 bg-[#FAF8F5] p-4">
      <p className="text-sm font-black text-[#0A3161]">
        Pick your categories
      </p>
      <p className="mt-1 text-xs leading-5 text-[#0A3161]/72">
        Your {plan.image_count} pictures are split evenly across whatever you choose.
        Pick one and all {plan.image_count} come from it.
      </p>

      <div className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-black/10 bg-white p-2">
        {categories.length === 0 ? (
          <p className="px-2 py-3 text-xs text-[#0A3161]/60">Loading categories…</p>
        ) : (
          categories.map((cat) => {
            const checked = selected.includes(cat.slug);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggle(cat.slug)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-semibold transition ${
                  checked
                    ? "bg-[#A6412B]/10 text-[#A6412B]"
                    : "text-[#0A3161] hover:bg-black/5"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${
                    checked ? "border-[#A6412B] bg-[#A6412B]" : "border-black/25"
                  }`}
                >
                  {checked && (
                    <svg viewBox="0 0 24 24" className="h-3 w-3 text-white">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  )}
                </span>
                <span className="truncate">{cat.name}</span>
              </button>
            );
          })
        )}
      </div>

      {split && (
        <p className="mt-3 text-xs font-bold text-[#0A3161]/80">
          {split
            .map((s) => {
              const cat = categories.find((c) => c.slug === s.slug);
              return `${s.count} from ${cat?.name || s.slug}`;
            })
            .join(" · ")}
        </p>
      )}

      {alreadyInCart && selected.length > 0 && (
        <p className="mt-3 text-xs font-bold text-[#A6412B]">
          This plan with these exact categories is already in your cart.
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setSelected([]);
          }}
          className="flex-1 rounded-xl border border-black/12 py-2.5 text-sm font-bold hover:border-[#A6412B]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={selected.length === 0 || alreadyInCart}
          className="flex-1 rounded-xl bg-[#A6412B] py-2.5 text-sm font-black text-white hover:bg-[#8C3520] disabled:cursor-not-allowed disabled:bg-black/20"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
