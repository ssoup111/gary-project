"use client";

import Link from "next/link";
import { useState } from "react";
import { categoryLabel } from "@/lib/categoryLabel";
import AddImageButton from "@/components/cart/AddImageButton";

type Props = {
  id: string;
  image_url: string | null;
  prompt: string;
  category_slug: string | null;
};

export default function CatalogImageCard({ id, image_url, prompt, category_slug }: Props) {
  const [broken, setBroken] = useState(false);

  return (
    <div className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-black/10 bg-[#F1F4F9] shadow-md shadow-black/10 transition hover:shadow-xl hover:shadow-black/15">
      <Link href={`/catalog/${encodeURIComponent(id)}`} className="block h-full w-full">
        {image_url && !broken ? (
          <img
            src={image_url}
            alt={prompt}
            loading="lazy"
            onError={() => setBroken(true)}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-[#0A3161]/58">
            Image unavailable
          </div>
        )}
      </Link>

      {/* Approved stamp */}
      <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#F2B33D] backdrop-blur-sm">
        <svg viewBox="0 0 24 24" className="h-3 w-3">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        Approved
      </span>

      {/* Title + Select — persistent on mobile, hover-reveal on desktop */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
        <p className="truncate text-sm font-bold text-white">{categoryLabel(category_slug)}</p>
        <AddImageButton image={{ id, image_url, prompt, category_slug }} />
      </div>
    </div>
  );
}
