"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function FavoriteButton({ imageId }: { imageId: string }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [status, setStatus] = useState("");

  async function checkFavorite() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) return;

    const { data } = await supabase
      .from("favorite_images")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("generated_image_id", imageId)
      .maybeSingle();

    setIsFavorite(!!data);
  }

  async function toggleFavorite() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setStatus("Sign in to save favorites.");
      return;
    }

    if (isFavorite) {
      const { error } = await supabase
        .from("favorite_images")
        .delete()
        .eq("user_id", userData.user.id)
        .eq("generated_image_id", imageId);

      if (error) {
        setStatus(error.message);
        return;
      }

      setIsFavorite(false);
      setStatus("Removed.");
      return;
    }

    const { error } = await supabase.from("favorite_images").insert({
      user_id: userData.user.id,
      generated_image_id: imageId,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setIsFavorite(true);
    setStatus("Saved.");
  }

  useEffect(() => {
    checkFavorite();
  }, []);

  return (
    <div>
      <button
        type="button"
        onClick={toggleFavorite}
        className={`rounded-xl px-4 py-2 text-sm font-black ${
          isFavorite ? "bg-[#A6412B] text-white" : "border border-[#8C3520] text-[#A6412B]"
        }`}
      >
        {isFavorite ? "Saved Favorite" : "Save Favorite"}
      </button>

      {status && <p className="mt-2 text-xs font-bold text-[#A6412B]">{status}</p>}
    </div>
  );
}
