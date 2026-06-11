"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  id: string;
  image_url: string | null;
  prompt: string;
};

export default function CatalogImageCard({ id, image_url, prompt }: Props) {
  const [broken, setBroken] = useState(false);

  if (!image_url || broken) {
    return (
      <div className="flex h-48 w-full items-center justify-center bg-zinc-800">
        <span className="text-xs text-zinc-600">Image unavailable</span>
      </div>
    );
  }

  return (
    <Link href={`/catalog/${encodeURIComponent(id)}`} className="block cursor-pointer bg-black">
      <img
        src={image_url}
        alt={prompt}
        className="w-full object-contain bg-black"
        onError={() => setBroken(true)}
      />
    </Link>
  );
}
