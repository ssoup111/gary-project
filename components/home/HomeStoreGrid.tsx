"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type StoreImage = {
  id: string;
  prompt: string;
  image_url: string | null;
  created_at: string;
  category_slug: string | null;
};

type Props = {
  initialImages: StoreImage[];
  initialHasMore: boolean;
};

const PAGE_SIZE = 96;

function StoreCard({ image }: { image: StoreImage }) {
  const [broken, setBroken] = useState(false);

  return (
    <div className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-md shadow-black/10 transition hover:shadow-xl hover:shadow-black/15">
      <Link href={`/catalog/${encodeURIComponent(image.id)}`} className="block">
        <div className="aspect-[4/5] w-full overflow-hidden bg-[#f1f4f9]">
          {image.image_url && !broken ? (
            <img
              src={image.image_url}
              alt={image.prompt}
              loading="lazy"
              onError={() => setBroken(true)}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-[#0A3161]/58">
              Image unavailable
            </div>
          )}
        </div>
      </Link>

      <div className="flex items-center justify-between gap-3 p-3.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#0A3161]">
            {image.prompt?.split(",")[0] || "Approved Image"}
          </p>
          <p className="text-xs font-semibold text-[#0A3161]/72">$0.99</p>
        </div>

        <Link
          href={`/order?imageId=${encodeURIComponent(image.id)}`}
          aria-label="Add to cart"
          title="Add to cart"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#B31942] text-white shadow-sm transition hover:scale-105 hover:bg-[#8f1434]"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="10" cy="21" r="1.4" fill="currentColor" />
            <circle cx="17" cy="21" r="1.4" fill="currentColor" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export default function HomeStoreGrid({ initialImages, initialHasMore }: Props) {
  const [images, setImages] = useState<StoreImage[]>(initialImages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(initialImages.length);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const params = new URLSearchParams({ offset: String(offsetRef.current) });
    const res = await fetch(`/api/catalog/images?${params}`);
    const data = await res.json();

    if (data.images?.length > 0) {
      setImages((prev) => [...prev, ...data.images]);
      offsetRef.current += data.images.length;
    }
    setHasMore(data.hasMore ?? false);
    setLoading(false);
  }, [loading, hasMore]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "500px" }
    );

    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {images.map((image) => (
          <StoreCard key={image.id} image={image} />
        ))}
      </div>

      {/* Sentinel for lazy loading */}
      <div ref={sentinelRef} className="h-4" />

      {loading && (
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-3 text-[#0A3161]/78">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-semibold">Loading more…</span>
          </div>
        </div>
      )}

      {!hasMore && images.length > 0 && (
        <p className="mt-10 text-center text-sm font-semibold text-[#0A3161]/58">
          You've reached the end of the catalog.
        </p>
      )}
    </div>
  );
}
