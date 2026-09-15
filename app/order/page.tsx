"use client";

/**
 * The ordering hub.
 *
 * Old links land here with ?imageId= or ?plan= and are sent straight on.
 * With no parameters this is a fork: a few pictures, or a package. Before
 * the cart existed this page WAS the order flow, so bookmarks and muscle
 * memory both point at it - it can't be a dead end.
 */

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useCart, formatPrice } from "@/lib/cart";

function Redirecting({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-[#FAF8F5] px-6 py-24 text-[#0A3161]">
      <div className="mx-auto max-w-md text-center">
        <p className="text-lg font-black text-[#A6412B]">{message}</p>
      </div>
    </main>
  );
}

function OrderHub() {
  const router = useRouter();
  const params = useSearchParams();
  const { addImage, ready, count, totalCents } = useCart();
  const handled = useRef(false);
  const [redirecting, setRedirecting] = useState<string | null>(null);

  const imageId = params.get("imageId");
  const planSlug = params.get("plan");

  useEffect(() => {
    if (!ready || handled.current) return;
    if (!imageId && !planSlug) return;
    handled.current = true;

    (async () => {
      if (imageId) {
        setRedirecting("Adding that picture to your cart…");
        const { data } = await supabase
          .from("generated_images")
          .select("id,image_url,prompt,category_slug")
          .eq("id", imageId)
          .eq("status", "approved")
          .single();

        if (data) {
          addImage(data, 99);
          router.replace("/cart");
          return;
        }
        setRedirecting("That picture is no longer available.");
        router.replace("/catalog");
        return;
      }

      // Packages need categories chosen, which happens on the pricing page.
      setRedirecting("Taking you to the packages…");
      router.replace("/pricing");
    })();
  }, [ready, imageId, planSlug, addImage, router]);

  if (redirecting) return <Redirecting message={redirecting} />;
  if (imageId || planSlug) return <Redirecting message="One moment…" />;

  return (
    <main className="min-h-screen bg-[#FAF8F5] px-6 py-16 text-[#0A3161]">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#A6412B]">
          Friends Behind Bars
        </p>
        <h1 className="mt-4 text-5xl font-black">What would you like to send?</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[#0A3161]/78">
          Add as much as you like to your cart — pictures, packages, or both — and
          pay once at the end.
        </p>

        {ready && count > 0 && (
          <Link
            href="/cart"
            className="mt-8 flex items-center justify-between rounded-2xl border-2 border-[#0A3161] bg-white px-6 py-4 transition hover:bg-[#F1F4F9]"
          >
            <span className="font-black text-[#0A3161]">
              You already have {count} {count === 1 ? "item" : "items"} in your cart
            </span>
            <span className="font-black text-[#A6412B]">
              {formatPrice(totalCents)} · View Cart →
            </span>
          </Link>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {/* A few pictures */}
          <Link
            href="/catalog"
            className="group flex flex-col rounded-3xl border border-black/10 bg-white p-8 transition hover:border-[#A6412B] hover:shadow-xl hover:shadow-black/10"
          >
            <span className="text-xs font-black uppercase tracking-widest text-[#A6412B]">
              Pick them yourself
            </span>
            <span className="mt-3 text-2xl font-black">A few pictures</span>
            <span className="mt-3 flex-1 text-sm leading-6 text-[#0A3161]/78">
              Browse the catalog and choose exactly which pictures to send. Add as
              many as you want to your cart.
            </span>
            <span className="mt-6 text-3xl font-black">$0.99</span>
            <span className="text-sm text-[#0A3161]/72">per picture</span>
            <span className="mt-6 rounded-2xl bg-[#A6412B] py-3 text-center font-black text-white group-hover:bg-[#8C3520]">
              Browse Pictures →
            </span>
          </Link>

          {/* A package */}
          <Link
            href="/pricing"
            className="group flex flex-col rounded-3xl border border-black/10 bg-white p-8 transition hover:border-[#A6412B] hover:shadow-xl hover:shadow-black/10"
          >
            <span className="text-xs font-black uppercase tracking-widest text-[#A6412B]">
              We pick, you choose the categories
            </span>
            <span className="mt-3 text-2xl font-black">A package or plan</span>
            <span className="mt-3 flex-1 text-sm leading-6 text-[#0A3161]/78">
              5 to 100 pictures in one go, split across the categories you choose —
              or a daily subscription. Cheaper per picture.
            </span>
            <span className="mt-6 text-3xl font-black">from $4.49</span>
            <span className="text-sm text-[#0A3161]/72">as low as $0.35 per picture</span>
            <span className="mt-6 rounded-2xl border border-black/12 py-3 text-center font-black text-[#0A3161] group-hover:border-[#A6412B] group-hover:text-[#A6412B]">
              See Packages →
            </span>
          </Link>
        </div>

        <p className="mt-8 text-sm text-[#0A3161]/68">
          Everything in one order goes to a single recipient. You choose who at
          checkout.
        </p>
      </div>
    </main>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<Redirecting message="One moment…" />}>
      <OrderHub />
    </Suspense>
  );
}
