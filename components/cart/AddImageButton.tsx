"use client";

import Link from "next/link";
import { useCart, type CartImage } from "@/lib/cart";

const SINGLE_IMAGE_CENTS = 99;

type Props = {
  image: CartImage;
  /** "card" is the compact button on catalog tiles, "full" is the detail page. */
  variant?: "card" | "full";
};

export default function AddImageButton({ image, variant = "card" }: Props) {
  const { addImage, hasImage } = useCart();
  const inCart = hasImage(image.id);

  if (variant === "full") {
    return inCart ? (
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#0A3161] bg-[#F1F4F9] px-6 py-3 font-black text-[#0A3161]">
          <svg viewBox="0 0 24 24" className="h-5 w-5">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          In Your Cart
        </div>
        <Link
          href="/cart"
          className="block w-full rounded-xl bg-[#A6412B] px-6 py-3 text-center font-black text-white hover:bg-[#8C3520]"
        >
          View Cart →
        </Link>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => addImage(image, SINGLE_IMAGE_CENTS)}
        className="mt-6 block w-full rounded-xl bg-[#A6412B] px-6 py-3 text-center font-black text-white hover:bg-[#8C3520]"
      >
        Add to Cart →
      </button>
    );
  }

  return inCart ? (
    <Link
      href="/cart"
      className="pointer-events-auto flex shrink-0 items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-black text-[#0A3161] hover:bg-[#F1F4F9]"
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3">
        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      Added
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => addImage(image, SINGLE_IMAGE_CENTS)}
      className="pointer-events-auto shrink-0 rounded-lg bg-[#A6412B] px-3 py-1.5 text-xs font-black text-white hover:bg-[#8C3520]"
    >
      Add · $0.99
    </button>
  );
}
