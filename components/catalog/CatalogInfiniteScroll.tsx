"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
      <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {images.map((image) => (
          <CatalogImageCard
            key={image.id}
            id={image.id}
            image_url={image.image_url}
            prompt={image.prompt}
            category_slug={image.category_slug}
          />
        ))}
      </div>

      {/* Sentinel — IntersectionObserver watches this */}
      <div ref={sentinelRef} className="h-4" />

      {/* Loading indicator */}
      {loading && (
        <div className="mt-6 flex justify-center">
          <div className="flex items-center gap-3 text-[#0A3161]/78">
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
        <div className="mt-10 py-8 text-center text-sm text-[#0A3161]/68">
          You&apos;ve seen all {total.toLocaleString()} images
          {category ? " in this category" : ""}.
        </div>
      )}
    </>
  );
}
