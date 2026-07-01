"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import CatalogImageCard from "./CatalogImageCard";

type CatalogImage = {
  id: string;
  prompt: string;
  image_url: string | null;
  created_at: string;
  category_slug: string | null;
};

type Props = {
  initialImages: CatalogImage[];
  initialHasMore: boolean;
  category: string;
  total: number;
};

const PAGE_SIZE = 96;

export default function CatalogInfiniteScroll({ initialImages, initialHasMore, category, total }: Props) {
  const [images, setImages] = useState<CatalogImage[]>(initialImages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(initialImages.length);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const params = new URLSearchParams({ offset: String(offsetRef.current) });
    if (category) params.set("category", category);

    const res = await fetch(`/api/catalog/images?${params}`);
    const data = await res.json();

    if (data.images?.length > 0) {
      setImages((prev) => [...prev, ...data.images]);
      offsetRef.current += data.images.length;
    }
    setHasMore(data.hasMore ?? false);
    setLoading(false);
  }, [loading, hasMore, category]);

  // Wire up IntersectionObserver on the sentinel div
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" } // start loading 400px before the sentinel is visible
    );

    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  return (
    <>
      <div className="mt-12 columns-1 gap-7 sm:columns-2 lg:columns-3 xl:columns-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="mb-7 break-inside-avoid overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/30"
          >
            <CatalogImageCard id={image.id} image_url={image.image_url} prompt={image.prompt} />
            <div className="p-5">
              <p className="line-clamp-4 text-sm leading-6 text-zinc-400">{image.prompt}</p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-400">
                  Approved
                </span>
                <Link
                  href={`/order?imageId=${encodeURIComponent(image.id)}`}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-black hover:bg-amber-300"
                >
                  Select
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sentinel — IntersectionObserver watches this */}
      <div ref={sentinelRef} className="h-4" />

      {/* Loading indicator */}
      {loading && (
        <div className="mt-6 flex justify-center">
          <div className="flex items-center gap-3 text-zinc-400">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading more images…
          </div>
        </div>
      )}

      {/* End of results */}
      {!hasMore && images.length > 0 && (
        <div className="mt-10 py-8 text-center text-sm text-zinc-600">
          You&apos;ve seen all {total.toLocaleString()} images
          {category ? " in this category" : ""}.
        </div>
      )}
    </>
  );
}
