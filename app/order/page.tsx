"use client";

/**
 * Legacy entry point.
 *
 * Ordering used to happen here: one plan, one picture, straight to Stripe.
 * That flow is gone - everything goes through the cart now. Old links and
 * bookmarks still land here, so this quietly puts the requested item in the
 * cart and sends the customer on to the right page.
 */

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/lib/cart";

function OrderRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const { addImage, ready } = useCart();
  const handled = useRef(false);
  const [message, setMessage] = useState("One moment…");

  const imageId = params.get("imageId");
  const planSlug = params.get("plan");

  useEffect(() => {
    if (!ready || handled.current) return;
    handled.current = true;

    (async () => {
      if (imageId) {
        const { data } = await supabase
          .from("generated_images")
          .select("id,image_url,prompt,category_slug")
          .eq("id", imageId)
          .eq("status", "approved")
          .single();

        if (data) {
          addImage(data, 99);
          setMessage("Added to your cart — taking you there…");
          router.replace("/cart");
          return;
        }
        setMessage("That picture is no longer available.");
        router.replace("/catalog");
        return;
      }

      if (planSlug) {
        // Packages need categories picked, which happens on the pricing page.
        setMessage("Taking you to the packages…");
        router.replace("/pricing");
        return;
      }

      router.replace("/catalog");
    })();
  }, [ready, imageId, planSlug, addImage, router]);

  return (
    <main className="min-h-screen bg-[#FAF8F5] px-6 py-24 text-[#0A3161]">
      <div className="mx-auto max-w-md text-center">
        <p className="text-lg font-black text-[#A6412B]">{message}</p>
      </div>
    </main>
  );
}

export default function OrderPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#FAF8F5] px-6 py-24 text-[#0A3161]">
          <div className="mx-auto max-w-md text-center">
            <p className="text-lg font-black text-[#A6412B]">One moment…</p>
          </div>
        </main>
      }
    >
      <OrderRedirect />
    </Suspense>
  );
}
