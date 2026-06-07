"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import FavoriteButton from "@/components/favorites/FavoriteButton";

type CatalogImage = {
  id: string;
  prompt: string;
  image_url: string | null;
  category_slug: string | null;
  created_at: string;
};

export default function ImageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const hasHistory = useRef(false);
  useEffect(() => { hasHistory.current = window.history.length > 1; }, []);

  const [image, setImage] = useState<CatalogImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadImage() {
      const { data, error } = await supabase
        .from("generated_images")
        .select("id,prompt,image_url,category_slug,created_at")
        .eq("id", id)
        .eq("status", "approved")
        .single();

      if (error || !data) {
        setError("Image not found.");
        setLoading(false);
        return;
      }

      setImage(data);
      setLoading(false);
    }

    if (id) loadImage();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="font-bold text-amber-300">Loading image...</p>
        </div>
      </main>
    );
  }

  if (error || !image) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="font-bold text-red-400">{error || "Image not found."}</p>
          <Link href="/catalog" className="mt-4 inline-block rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold hover:border-amber-400">
            ← Back to Catalog
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">

        {/* Back button */}
        <button
          type="button"
          onClick={() => hasHistory.current ? router.back() : router.push("/catalog")}
          className="mb-8 flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 hover:border-amber-400 hover:text-amber-300"
        >
          ← Back to Catalog
        </button>

        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">

          {/* Image */}
          <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-black">
            {image.image_url && (
              <img
                src={image.image_url}
                alt={image.prompt}
                className="w-full object-contain"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
                {image.category_slug || "Approved Image"}
              </p>
              <p className="mt-4 text-lg leading-7 text-zinc-300">{image.prompt}</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Single Image Delivery</p>
              <p className="mt-2 text-4xl font-black">$1.99</p>
              <p className="mt-2 text-sm text-zinc-400">Delivered directly to your recipient's facility.</p>

              <Link
                href={`/order?imageId=${encodeURIComponent(image.id)}`}
                className="mt-6 block w-full rounded-xl bg-white px-6 py-3 text-center font-black text-black hover:bg-amber-300"
              >
                Add to Order →
              </Link>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <p className="mb-3 text-sm font-bold uppercase tracking-widest text-zinc-500">Save for Later</p>
              <FavoriteButton imageId={image.id} />
            </div>

            <Link
              href="/catalog"
              className="rounded-xl border border-zinc-700 px-6 py-3 text-center text-sm font-bold text-zinc-200 hover:border-amber-400"
            >
              Browse More Images
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
