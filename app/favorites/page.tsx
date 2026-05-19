"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/auth/AuthGuard";
import AccountNav from "@/components/auth/AccountNav";
import { supabase } from "@/lib/supabaseClient";

type Favorite = {
  id: string;
  generated_image_id: string;
};

type CatalogImage = {
  id: string;
  prompt: string;
  image_url: string | null;
};

export default function FavoritesPage() {
  const [images, setImages] = useState<CatalogImage[]>([]);
  const [status, setStatus] = useState("Loading favorites...");

  async function loadFavorites() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setStatus("Sign in to view favorites.");
      return;
    }

    const { data: favorites, error } = await supabase
      .from("favorite_images")
      .select("id,generated_image_id")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(error.message);
      return;
    }

    const imageIds = (favorites || []).map((favorite: Favorite) => favorite.generated_image_id);

    if (imageIds.length === 0) {
      setImages([]);
      setStatus("");
      return;
    }

    const { data: imageData, error: imageError } = await supabase
      .from("generated_images")
      .select("id,prompt,image_url")
      .in("id", imageIds);

    if (imageError) {
      setStatus(imageError.message);
      return;
    }

    setImages(imageData || []);
    setStatus("");
  }

  useEffect(() => {
    loadFavorites();
  }, []);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <AccountNav />

          <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
            Friends Behind Bars
          </p>

          <h1 className="mt-4 text-5xl font-black">Saved Favorites</h1>

          <p className="mt-4 text-zinc-400">
            Images saved for later ordering.
          </p>

          {status ? (
            <p className="mt-8 font-bold text-amber-300">{status}</p>
          ) : images.length === 0 ? (
            <p className="mt-8 text-zinc-400">No saved favorites yet.</p>
          ) : (
            <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((image) => (
                <div key={image.id} className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
                  {image.image_url && (
                    <a href={image.image_url} target="_blank" rel="noopener noreferrer" className="block bg-black">
                      <img src={image.image_url} alt={image.prompt} className="w-full object-contain" />
                    </a>
                  )}

                  <div className="p-5">
                    <p className="line-clamp-4 text-sm leading-6 text-zinc-400">
                      {image.prompt}
                    </p>

                    <Link
                      href={`/order?imageId=${encodeURIComponent(image.id)}`}
                      className="mt-5 inline-block rounded-xl bg-white px-4 py-2 text-sm font-black text-black"
                    >
                      Order This Image
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
