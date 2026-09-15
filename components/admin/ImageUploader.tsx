"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Category = { id: string; name: string; slug: string };

/**
 * Upload pictures from whatever device the admin is on.
 *
 * Photos off a phone are often 5-10 MB, which is slow and larger than the
 * catalog needs, so each one is scaled down in the browser before it is
 * sent. The server still enforces its own limit.
 */
const MAX_EDGE = 2048;
const JPEG_QUALITY = 0.85;

async function shrink(file: File): Promise<Blob> {
  // PNGs may be transparent artwork; leave them be if they're already small.
  if (file.size < 600 * 1024) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 3 * 1024 * 1024) return file;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );
  return blob && blob.size < file.size ? blob : file;
}

export default function ImageUploader({
  categories,
  onDone,
}: {
  categories: Category[];
  onDone: () => void;
}) {
  const [categorySlug, setCategorySlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!categorySlug) {
      setErrors(["Choose a category before picking pictures."]);
      return;
    }

    setBusy(true);
    setErrors([]);

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setErrors(["You're signed out. Sign in again and retry."]);
      setBusy(false);
      return;
    }

    const list = Array.from(files);
    let done = 0;
    const failed: string[] = [];

    for (const file of list) {
      setProgress(`Uploading ${done + 1} of ${list.length} — ${file.name}`);
      try {
        const body = new FormData();
        const shrunk = await shrink(file);
        const named =
          shrunk instanceof File
            ? shrunk
            : new File([shrunk], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });

        body.append("file", named);
        body.append("categorySlug", categorySlug);
        body.append("title", file.name.replace(/\.[^.]+$/, "").slice(0, 80));

        const res = await fetch("/api/admin/images/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body,
        });
        const result = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
        if (!result.success) failed.push(`${file.name}: ${result.error}`);
        else done++;
      } catch (e) {
        failed.push(`${file.name}: ${e instanceof Error ? e.message : "failed"}`);
      }
    }

    setBusy(false);
    setProgress(
      failed.length === 0
        ? `${done} picture${done === 1 ? "" : "s"} uploaded — waiting for review below.`
        : `${done} uploaded, ${failed.length} failed.`
    );
    setErrors(failed);
    if (inputRef.current) inputRef.current.value = "";
    onDone();
  }

  return (
    <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-lg font-black text-white">Upload Pictures</h2>
      <p className="mt-1 text-sm text-zinc-400">
        From this computer, your phone, or any device you&apos;re signed in on. They arrive as
        pending review, same as everything else.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[240px_1fr]">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Category
          </label>
          <select
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            disabled={busy}
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-sm text-white"
          >
            <option value="">Choose a category...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Pictures
          </label>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy || !categorySlug}
            onChange={(e) => handleFiles(e.target.files)}
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-400 file:px-4 file:py-2 file:text-sm file:font-black file:text-black disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Pick several at once. Large photos are scaled down before sending.
          </p>
        </div>
      </div>

      {progress && <p className="mt-3 text-sm font-bold text-amber-300">{progress}</p>}

      {errors.length > 0 && (
        <ul className="mt-2 space-y-1">
          {errors.map((e, i) => (
            <li key={i} className="text-xs text-red-400">{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
