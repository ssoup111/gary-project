"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import FavoriteButton from "@/components/favorites/FavoriteButton";
import { categoryLabel } from "@/lib/categoryLabel";
import AddImageButton from "@/components/cart/AddImageButton";

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
      <main className="min-h-screen bg-[#FAF8F5] px-6 py-16 text-[#0A3161]">
        <div className="mx-auto max-w-4xl">
          <p className="font-bold text-[#A6412B]">Loading image...</p>
        </div>
      </main>
    );
  }

  if (error || !image) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] px-6 py-16 text-[#0A3161]">
        <div className="mx-auto max-w-4xl">
          <p className="font-bold text-red-700">{error || "Image not found."}</p>
          <Link href="/catalog" className="mt-4 inline-block rounded-xl border border-black/12 px-4 py-2 text-sm font-bold hover:border-[#A6412B]">
            ← Back to Catalog
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F5] px-6 py-16 text-[#0A3161]">
      <div className="mx-auto max-w-4xl">

        {/* Back button */}
        <button
          type="button"
          onClick={() => hasHistory.current ? router.back() : router.push("/catalog")}
          className="mb-8 flex items-center gap-2 rounded-xl border border-black/12 px-4 py-2 text-sm font-bold text-[#0A3161] hover:border-[#A6412B] hover:text-[#A6412B]"
        >
          ← Back to Catalog
        </button>

        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">

          {/* Image */}
          <div className="overflow-hidden rounded-3xl border border-black/10 bg-black">
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
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#A6412B]">
                {categoryLabel(image.category_slug)}
              </p>
              <p className="mt-4 text-lg leading-7 text-[#0A3161]/85">
                A reviewed, approved image from our {categoryLabel(image.category_slug)} collection — ready to send.
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-6">
              <p className="text-sm font-bold uppercase tracking-widest text-[#0A3161]/72">Single Image Delivery</p>
              <p className="mt-2 text-4xl font-black">$0.99</p>
              <p className="mt-2 text-sm text-[#0A3161]/78">Delivered directly to your recipient's facility.</p>

              <AddImageButton
                variant="full"
                image={{
                  id: image.id,
                  image_url: image.image_url,
                  prompt: image.prompt,
                  category_slug: image.category_slug,
                }}
              />
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-6">
              <p className="mb-3 text-sm font-bold uppercase tracking-widest text-[#0A3161]/72">Save for Later</p>
              <FavoriteButton imageId={image.id} />
            </div>

            <Link
              href="/catalog"
              className="rounded-xl border border-black/12 px-6 py-3 text-center text-sm font-bold text-[#0A3161] hover:border-[#A6412B]"
            >
              Browse More Images
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
