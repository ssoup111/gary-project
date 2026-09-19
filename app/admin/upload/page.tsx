"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminNav from "@/components/admin/AdminNav";
import ImageUploader from "@/components/admin/ImageUploader";

type Category = { id: string; name: string; slug: string };

/**
 * A page that does one thing.
 *
 * Uploading used to be a panel at the top of /admin/images, above two
 * hundred thumbnails and a wall of filters, with nothing in the menu
 * pointing at it. It was there and nobody could find it.
 */
export default function AdminUploadPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [pending, setPending] = useState<number | null>(null);

  async function load() {
    const [{ data: cats }, { count }] = await Promise.all([
      supabase.from("categories").select("id,name,slug").eq("is_active", true).order("name"),
      supabase
        .from("generated_images")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_review"),
    ]);
    setCategories(cats || []);
    setPending(count ?? 0);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <AdminNav />

        <h1 className="text-5xl font-black">Add Pictures</h1>
        <p className="mt-2 text-zinc-400">
          Upload from this computer or your phone. Nothing goes on sale until
          it&apos;s approved.
        </p>

        <div className="mt-8">
          <ImageUploader categories={categories} onDone={load} />
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-xs font-black uppercase tracking-widest text-amber-400">
            Step 3
          </p>
          <p className="mt-1 text-lg font-black text-white">Approve them</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {pending === null
              ? "Uploads wait for review before customers can buy them."
              : pending === 0
              ? "Nothing is waiting for review right now."
              : `${pending} picture${pending === 1 ? "" : "s"} waiting for review.`}
          </p>
          <Link
            href="/admin/images"
            className="mt-4 inline-block rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-black hover:bg-amber-300"
          >
            Review Pictures →
          </Link>
        </div>
      </div>
    </main>
  );
}
