"use client";

import { useCallback, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Category = { id: string; name: string; slug: string };
type Done = { name: string; url: string };

/**
 * Upload pictures from whatever device the admin is on.
 *
 * Phone photos are often 5-10 MB, larger than the catalog needs and larger
 * than a serverless request should carry, so each one is scaled down in the
 * browser first. The server enforces its own limit regardless.
 */
const MAX_EDGE = 2048;
const JPEG_QUALITY = 0.85;

async function shrink(file: File): Promise<Blob> {
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
  const [uploaded, setUploaded] = useState<Done[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files) return;
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (list.length === 0) return;

      if (!categorySlug) {
        setErrors(["Choose a category first — pictures without one never appear in the catalog."]);
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

      let done = 0;
      const failed: string[] = [];
      const succeeded: Done[] = [];

      for (const file of list) {
        setProgress(`Uploading ${done + failed.length + 1} of ${list.length} — ${file.name}`);
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
          else {
            done++;
            succeeded.push({ name: file.name, url: result.imageUrl });
          }
        } catch (e) {
          failed.push(`${file.name}: ${e instanceof Error ? e.message : "failed"}`);
        }
      }

      setBusy(false);
      setProgress(
        failed.length === 0
          ? `${done} picture${done === 1 ? "" : "s"} uploaded.`
          : `${done} uploaded, ${failed.length} failed.`
      );
      setErrors(failed);
      setUploaded((prev) => [...succeeded, ...prev].slice(0, 24));
      if (inputRef.current) inputRef.current.value = "";
      onDone();
    },
    [categorySlug, onDone]
  );

  const categoryName = categories.find((c) => c.slug === categorySlug)?.name;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      {/* Step 1 */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-amber-400">Step 1</p>
        <label className="mt-1 block text-lg font-black text-white">
          Which category?
        </label>
        <select
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
          disabled={busy}
          className="mt-3 w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white"
        >
          <option value="">Choose a category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Step 2 */}
      <div className="mt-8">
        <p className="text-xs font-black uppercase tracking-widest text-amber-400">Step 2</p>
        <p className="mt-1 text-lg font-black text-white">
          {categorySlug ? `Add pictures to ${categoryName}` : "Add pictures"}
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); if (categorySlug && !busy) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!busy) handleFiles(e.dataTransfer.files);
          }}
          onClick={() => !busy && categorySlug && inputRef.current?.click()}
          className={
            "mt-3 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition " +
            (!categorySlug
              ? "cursor-not-allowed border-zinc-800 bg-zinc-950/50"
              : dragging
              ? "border-amber-400 bg-amber-400/10"
              : "border-zinc-600 bg-zinc-950 hover:border-amber-400")
          }
        >
          {!categorySlug ? (
            <p className="text-sm text-zinc-500">Choose a category above first</p>
          ) : busy ? (
            <p className="text-sm font-bold text-amber-300">{progress}</p>
          ) : (
            <>
              <p className="text-base font-black text-white">
                Drag pictures here, or click to choose
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                Several at once is fine. From this computer or your phone.
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                JPG, PNG or WebP. Big photos are shrunk automatically.
              </p>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy || !categorySlug}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {progress && !busy && (
        <p className="mt-4 text-sm font-bold text-amber-300">{progress}</p>
      )}

      {errors.length > 0 && (
        <ul className="mt-3 space-y-1">
          {errors.map((e, i) => (
            <li key={i} className="text-xs text-red-400">{e}</li>
          ))}
        </ul>
      )}

      {uploaded.length > 0 && (
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-sm font-black text-white">
            Just uploaded — waiting for approval
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            These are not on sale yet. Approve them below, or on the Pictures page.
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {uploaded.map((u) => (
              <img
                key={u.url}
                src={u.url}
                alt={u.name}
                className="aspect-square w-full rounded-lg border border-zinc-700 object-cover"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
