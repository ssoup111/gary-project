"use client";

import Link from "next/link";
import { useCart, formatPrice, type CartItem } from "@/lib/cart";
import { categoryLabel } from "@/lib/categoryLabel";

function ImageRow({ item, onRemove }: { item: CartItem; onRemove: () => void }) {
  const img = item.image!;
  return (
    <div className="flex items-center gap-4 border-b border-black/10 py-4 last:border-b-0">
      <Link
        href={`/catalog/${encodeURIComponent(img.id)}`}
        className="h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-[#F1F4F9]"
      >
        {img.image_url ? (
          <img src={img.image_url} alt={img.prompt} className="h-full w-full object-cover" />
        ) : null}
      </Link>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-[#A6412B]">
          {categoryLabel(img.category_slug)}
        </p>
        <p className="mt-0.5 truncate text-sm font-bold text-[#0A3161]">Single picture</p>
        <p className="mt-0.5 text-xs text-[#0A3161]/65">Delivered to your recipient</p>
      </div>

      <p className="shrink-0 font-black text-[#0A3161]">{formatPrice(item.price_cents)}</p>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove this picture from your cart"
        className="shrink-0 rounded-lg border border-black/12 px-3 py-1.5 text-xs font-bold text-[#0A3161]/70 transition hover:border-red-600 hover:text-red-700"
      >
        Remove
      </button>
    </div>
  );
}

function PlanRow({ item, onRemove }: { item: CartItem; onRemove: () => void }) {
  const plan = item.plan!;
  const n = item.category_slugs.length;
  const base = n > 0 ? Math.floor(plan.image_count / n) : 0;
  const remainder = n > 0 ? plan.image_count % n : 0;

  return (
    <div className="flex items-start gap-4 border-b border-black/10 py-4 last:border-b-0">
      <div className="flex h-20 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-black/10 bg-[#0A3161] text-white">
        <span className="text-xl font-black leading-none">{plan.image_count}</span>
        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider">pics</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-[#A6412B]">
          {plan.plan_type === "subscription" ? "Subscription" : "Package"}
        </p>
        <p className="mt-0.5 text-sm font-bold text-[#0A3161]">{plan.name}</p>

        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {item.category_slugs.map((slug, i) => (
            <span
              key={slug}
              className="rounded-full bg-[#F1F4F9] px-2.5 py-1 text-[11px] font-bold text-[#0A3161]"
            >
              {categoryLabel(slug)} · {base + (i < remainder ? 1 : 0)}
            </span>
          ))}
        </div>

        {plan.plan_type === "subscription" && plan.duration_days ? (
          <p className="mt-1.5 text-xs text-[#0A3161]/65">
            One picture a day for {plan.duration_days} days
          </p>
        ) : null}
      </div>

      <p className="shrink-0 font-black text-[#0A3161]">{formatPrice(item.price_cents)}</p>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove the ${plan.name} plan from your cart`}
        className="shrink-0 rounded-lg border border-black/12 px-3 py-1.5 text-xs font-bold text-[#0A3161]/70 transition hover:border-red-600 hover:text-red-700"
      >
        Remove
      </button>
    </div>
  );
}

export default function CartPage() {
  const { items, count, totalCents, ready, removeItem, clear } = useCart();

  const images = items.filter((i) => i.item_type === "image");
  const plans = items.filter((i) => i.item_type === "plan");
  const planPictureTotal = plans.reduce((sum, i) => sum + (i.plan?.image_count || 0), 0);

  if (!ready) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] px-6 py-16 text-[#0A3161]">
        <div className="mx-auto max-w-3xl">
          <p className="font-bold text-[#A6412B]">Loading your cart…</p>
        </div>
      </main>
    );
  }

  if (count === 0) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] px-6 py-16 text-[#0A3161]">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-black">Your cart is empty</h1>
          <p className="mx-auto mt-3 max-w-md text-lg leading-7 text-[#0A3161]/78">
            Add as many pictures and packages as you like — you only pay once, at the end.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/catalog"
              className="rounded-2xl bg-[#A6412B] px-8 py-3 font-black text-white hover:bg-[#8C3520]"
            >
              Browse Pictures →
            </Link>
            <Link
              href="/pricing"
              className="rounded-2xl border border-black/12 px-8 py-3 font-bold hover:border-[#A6412B]"
            >
              See Packages
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F5] px-6 py-12 text-[#0A3161]">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-black">Your Cart</h1>
        <p className="mt-2 text-[#0A3161]/78">
          {count} {count === 1 ? "item" : "items"}
          {planPictureTotal > 0 && (
            <> · {images.length + planPictureTotal} pictures in total</>
          )}
        </p>

        <div className="mt-8 rounded-3xl border border-black/10 bg-white px-6">
          {images.map((item) => (
            <ImageRow key={item.key} item={item} onRemove={() => removeItem(item.key)} />
          ))}
          {plans.map((item) => (
            <PlanRow key={item.key} item={item} onRemove={() => removeItem(item.key)} />
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6">
          <div className="flex items-center justify-between text-lg">
            <span className="font-bold">Total</span>
            <span className="text-3xl font-black">{formatPrice(totalCents)}</span>
          </div>
          <p className="mt-2 text-sm text-[#0A3161]/72">
            You choose who this goes to on the next step.
          </p>

          <Link
            href="/checkout"
            className="mt-6 block w-full rounded-2xl bg-[#A6412B] py-4 text-center text-lg font-black text-white hover:bg-[#8C3520]"
          >
            Checkout →
          </Link>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/catalog"
              className="flex-1 rounded-xl border border-black/12 py-2.5 text-center text-sm font-bold hover:border-[#A6412B]"
            >
              Keep Shopping
            </Link>
            <button
              type="button"
              onClick={clear}
              className="flex-1 rounded-xl border border-black/12 py-2.5 text-sm font-bold text-[#0A3161]/70 transition hover:border-red-600 hover:text-red-700"
            >
              Empty Cart
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
