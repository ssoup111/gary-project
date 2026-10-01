"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  imageId: string;
  /** "full" is the button on the detail page. "icon" is the compact heart
   *  used on catalog grid tiles, where there's no room for button text. */
  variant?: "full" | "icon";
};

export default function FavoriteButton({ imageId, variant = "full" }: Props) {
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

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={(e) => {
          // Cards wrap this in a <Link> to the detail page — don't navigate.
          e.preventDefault();
          e.stopPropagation();
          toggleFavorite();
        }}
        aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
        aria-pressed={isFavorite}
        title={status || (isFavorite ? "Saved to favorites" : "Save to favorites")}
        className="pointer-events-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm transition hover:bg-black/70"
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 ${isFavorite ? "text-[#A6412B]" : "text-white"}`}
          fill={isFavorite ? "currentColor" : "none"}
        >
          <path
            d="M12 20.5s-7.5-4.6-10-9.3C.4 7.8 2 4.5 5.3 4c2-.3 3.9.6 5 2.3a1 1 0 0 0 1.4 0c1.1-1.7 3-2.6 5-2.3 3.3.5 4.9 3.8 3.3 7.2-2.5 4.7-10 9.3-10 9.3Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );
  }

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
