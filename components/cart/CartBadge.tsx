"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export default function CartBadge({ className = "" }: { className?: string }) {
  const { count, ready } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      className={`relative flex items-center gap-2 rounded-xl border border-white/30 px-3 py-2 text-sm font-bold text-white transition hover:border-[#A6412B] hover:text-[#A6412B] ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 2-1.55L20.5 8H6.2"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="20" r="1.4" fill="currentColor" />
        <circle cx="17" cy="20" r="1.4" fill="currentColor" />
      </svg>
      <span className="hidden lg:inline">Cart</span>
      {ready && count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F2B33D] px-1 text-[11px] font-black text-[#0A3161]">
          {count}
        </span>
      )}
    </Link>
  );
}
