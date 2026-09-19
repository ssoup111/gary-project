"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useCart, formatPrice } from "@/lib/cart";

type OrderSummary = {
  reference: string;
  totalCents: number;
  itemCount: number;
  paid: boolean;
  email: string | null;
  recipientName: string | null;
  images: string[];
};

function ThankYou() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const { clear, ready: cartReady } = useCart();
  const cleared = useRef(false);

  const [order, setOrder] = useState<OrderSummary | null>(null);
  // No session id means nothing to confirm, so don't start in a loading state.
  const [stillWorking, setStillWorking] = useState(Boolean(sessionId));
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
  }, []);

  /**
   * Reaching this page with a session id means Stripe took the payment, so
   * the cart is spent - empty it regardless of whether the order lookup has
   * caught up yet.
   *
   * This used to hang off the lookup and read `count > 0`, but `count` was
   * captured before the cart had loaded from browser storage, so it was
   * always 0 and the cart never emptied. A customer then paid a second time
   * for the same basket.
   */
  useEffect(() => {
    if (!sessionId || !cartReady || cleared.current) return;
    cleared.current = true;
    // Emptying the cart is the point of this effect, and the ref makes it
    // run exactly once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    clear();
  }, [sessionId, cartReady, clear]);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let tries = 0;

    async function check() {
      tries++;
      const res = await fetch(`/api/orders/by-session?session_id=${encodeURIComponent(sessionId!)}`);
      const result = await res.json().catch(() => ({ success: false }));

      if (cancelled) return;

      if (result.success && result.order) {
        setOrder(result.order);
        setStillWorking(false);
        return;
      }
      // Stripe's webhook can lag a second or two behind the redirect.
      if (tries < 8) setTimeout(check, 1500);
      else setStillWorking(false);
    }

    check();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <main className="min-h-screen bg-[#FAF8F5] px-6 py-16 text-[#0A3161]">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#A6412B]">
          Payment received
        </p>
        <h1 className="mt-4 text-5xl font-black">Thank you!</h1>

        {stillWorking && !order && (
          <p className="mt-4 text-lg text-[#0A3161]/78">Confirming your order…</p>
        )}

        {order && (
          <>
            <p className="mt-4 text-lg leading-8 text-[#0A3161]/78">
              {order.itemCount} picture{order.itemCount === 1 ? "" : "s"}
              {order.recipientName ? ` on the way to ${order.recipientName}` : " are on the way"}.
              We&apos;ll deliver them to the facility, usually within 24 hours.
            </p>

            {order.images.length > 0 && (
              <div className="mt-6 grid grid-cols-4 gap-2">
                {order.images.map((url) => (
                  <img key={url} src={url} alt="" className="aspect-square w-full rounded-xl object-cover" />
                ))}
              </div>
            )}

            <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6">
              <div className="flex justify-between border-b border-black/10 pb-3">
                <span className="font-bold">Order</span>
                <span className="font-black">#{order.reference}</span>
              </div>
              <div className="flex justify-between border-b border-black/10 py-3">
                <span className="font-bold">Pictures</span>
                <span className="font-black">{order.itemCount}</span>
              </div>
              <div className="flex justify-between pt-3">
                <span className="font-bold">Paid</span>
                <span className="font-black">{formatPrice(order.totalCents)}</span>
              </div>
            </div>

            <p className="mt-4 text-sm text-[#0A3161]/72">
              A confirmation is on its way to {order.email || "your email"}.
            </p>
          </>
        )}

        {!stillWorking && !order && (
          <p className="mt-4 text-lg leading-8 text-[#0A3161]/78">
            Your payment went through. The order is still being set up — your
            confirmation email will have the details shortly.
          </p>
        )}

        {/* Guests: the order is already tied to their email, so an account
            made with that same address picks it up automatically. */}
        {signedIn === false && order && (
          <div className="mt-8 rounded-3xl border-2 border-[#0A3161] bg-white p-6">
            <p className="text-lg font-black">Want to track this order?</p>
            <p className="mt-2 text-sm leading-6 text-[#0A3161]/78">
              Create an account with{" "}
              <span className="font-bold">{order.email}</span> and this order
              appears in your history automatically — along with saved
              recipients so your next order takes seconds.
            </p>
            <Link
              href="/signup"
              className="mt-4 inline-block rounded-2xl bg-[#A6412B] px-6 py-3 font-black text-white hover:bg-[#8C3520]"
            >
              Create an Account →
            </Link>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/catalog"
            className="flex-1 rounded-2xl bg-[#A6412B] py-3 text-center font-black text-white hover:bg-[#8C3520]"
          >
            Send More Pictures
          </Link>
          {signedIn && (
            <Link
              href="/my-orders"
              className="flex-1 rounded-2xl border border-black/12 py-3 text-center font-bold hover:border-[#A6412B]"
            >
              My Orders
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#FAF8F5] px-6 py-24 text-[#0A3161]">
          <div className="mx-auto max-w-2xl">
            <p className="text-lg font-black text-[#A6412B]">Confirming your order…</p>
          </div>
        </main>
      }
    >
      <ThankYou />
    </Suspense>
  );
}
