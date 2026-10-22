"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AdminNav from "@/components/admin/AdminNav";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type Category = { id: string; name: string; slug: string; };
type GeneratedImage = { id: string; prompt: string; image_url: string | null; status: string; created_at: string; category_slug: string | null; };

type Mark = "approved" | "rejected";

function ImageCard({ image, categories, approvedCounts, onCategoryChange, saving, mark, onMark }: {
  image: GeneratedImage;
  categories: Category[];
  approvedCounts: Record<string, number>;
  onCategoryChange: (id: string, slug: string) => void;
  saving: string | null;
  mark: Mark | undefined;
  onMark: (id: string, mark: Mark | null) => void;
}) {
  const [selectedSlug, setSelectedSlug] = useState(image.category_slug || "");
  const approvedCount = image.category_slug ? (approvedCounts[image.category_slug] ?? 0) : null;

  return (
    <div className={"overflow-hidden rounded-2xl border-2 bg-zinc-900 " + (mark === "approved" ? "border-green-500" : mark === "rejected" ? "border-red-500" : "border-zinc-800")}>
      <div className="relative">
        {image.image_url && <img src={image.image_url} alt={image.prompt} className="h-56 w-full object-cover" />}
        {/* Approved count badge */}
        {approvedCount !== null && (
          <span className={"absolute top-2 right-2 rounded-full px-2 py-1 text-xs font-bold " + (approvedCount >= 50 ? "bg-red-600 text-white" : approvedCount >= 20 ? "bg-amber-500 text-black" : "bg-green-600 text-white")}>
            {approvedCount} approved
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs leading-5 text-zinc-400 line-clamp-2">{image.prompt}</p>
        <span className={"mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider " + (image.status === "approved" ? "bg-green-500/20 text-green-400" : image.status === "rejected" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400")}>
          {image.status}
        </span>
        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Category</label>
          <select value={selectedSlug} onChange={(e) => setSelectedSlug(e.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-sm text-white">
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}{approvedCounts[c.slug] !== undefined ? ` (${approvedCounts[c.slug]} approved)` : ""}
              </option>
            ))}
          </select>
          <button onClick={() => onCategoryChange(image.id, selectedSlug)} disabled={saving === image.id} className="mt-2 rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-black text-black disabled:opacity-60">
            {saving === image.id ? "Saving..." : "Save Category"}
          </button>
          {image.category_slug && <p className="mt-1 text-xs text-amber-300">Current: {image.category_slug}</p>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className={"flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-black " + (mark === "approved" ? "border-green-500 bg-green-500 text-black" : "border-zinc-700 text-zinc-300")}>
            <input type="checkbox" checked={mark === "approved"} onChange={(e) => onMark(image.id, e.target.checked ? "approved" : null)} className="h-5 w-5 accent-green-600" />
            Approve
          </label>
          <label className={"flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-black " + (mark === "rejected" ? "border-red-500 bg-red-500 text-white" : "border-zinc-700 text-zinc-300")}>
            <input type="checkbox" checked={mark === "rejected"} onChange={(e) => onMark(image.id, e.target.checked ? "rejected" : null)} className="h-5 w-5 accent-red-600" />
            Reject
          </label>
        </div>
      </div>
    </div>
  );
}

export default function AdminImagesPage() {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [approvedCounts, setApprovedCounts] = useState<Record<string, number>>({});
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending_review");
  const [filterCategory, setFilterCategory] = useState("all");
  const [statusMsg, setStatusMsg] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  // What the reviewer has ticked on this page: approve or reject per image.
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [bulkSaving, setBulkSaving] = useState(false);

  async function loadData() {
    setLoading(true);

    const { data: categoryData } = await supabase.from("categories").select("id,name,slug").order("name");
    const cats = categoryData || [];
    setCategories(cats);

    // Exact per-category counts. (Selecting the rows themselves is capped at
    // 1000 by the API, which hid every category past the first few.)
    const countFor = async (slug: string, status: string) => {
      const { count } = await supabase
        .from("generated_images")
        .select("id", { count: "exact", head: true })
        .eq("category_slug", slug)
        .eq("status", status);
      return count || 0;
    };
    const results = await Promise.all(
      cats.map(async (c) => [c.slug, await countFor(c.slug, "approved"), await countFor(c.slug, "pending_review")] as const)
    );
    const aCounts: Record<string, number> = {};
    const pCounts: Record<string, number> = {};
    for (const [slug, approved, pending] of results) {
      aCounts[slug] = approved;
      pCounts[slug] = pending;
    }
    setApprovedCounts(aCounts);
    setPendingCounts(pCounts);

    // Load images with both filters
    let query = supabase
      .from("generated_images")
      .select("id,prompt,image_url,status,created_at,category_slug")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    if (filterCategory !== "all") query = query.eq("category_slug", filterCategory);

    const { data } = await query;
    setImages(data || []);
    setMarks({});
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [filterStatus, filterCategory]);

  /**
   * The admin API rejects anything without a bearer token. These calls were
   * sending none, so every approve came back 401 while the page reported
   * success.
   */
  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async function handleCategoryChange(imageId: string, categorySlug: string) {
    setSavingId(imageId);
    const response = await fetch("/api/admin/images/update-category", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ imageId, categorySlug }) });
    const result = await response.json();
    setSavingId(null);
    if (!result.success) { setStatusMsg(result.error || "Category update failed."); return; }
    setStatusMsg("Category updated.");
    await loadData();
  }

  function setMark(id: string, mark: Mark | null) {
    setMarks((prev) => {
      const next = { ...prev };
      if (mark) next[id] = mark; else delete next[id];
      return next;
    });
  }
  function markAll(mark: Mark) { setMarks(Object.fromEntries(images.map((i) => [i.id, mark]))); }
  function clearMarks() { setMarks({}); }

  /** Apply every tick on the page: ticked Approve -> approved, ticked Reject -> rejected. */
  async function submitMarks() {
    const entries = Object.entries(marks);
    if (entries.length === 0) return;
    setBulkSaving(true);
    const headers = await authHeaders();

    let approved = 0;
    let rejected = 0;
    let failed = 0;
    let firstError = "";

    // In batches, so a few hundred images don't all fire at once.
    const BATCH = 8;
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH);
      setStatusMsg(`Saving ${Math.min(i + BATCH, entries.length)} of ${entries.length}...`);
      const results = await Promise.all(
        batch.map(async ([id, status]) => {
          try {
            const res = await fetch("/api/admin/images/update-status", {
              method: "POST",
              headers,
              body: JSON.stringify({ imageId: id, status }),
            });
            const body = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
            return { status, error: body?.success === true ? null : (body?.error || `HTTP ${res.status}`) };
          } catch (e) {
            return { status, error: e instanceof Error ? e.message : "Request failed" };
          }
        })
      );
      for (const r of results) {
        if (r.error === null) { if (r.status === "approved") approved++; else rejected++; }
        else { failed++; if (!firstError) firstError = r.error; }
      }
    }

    setBulkSaving(false);
    setStatusMsg(
      `${approved} approved, ${rejected} rejected` + (failed ? `, ${failed} failed — ${firstError}` : ".")
    );
    await loadData();
  }

  const approveCount = Object.values(marks).filter((m) => m === "approved").length;
  const rejectCount = Object.values(marks).filter((m) => m === "rejected").length;
  const totalPending = Object.values(pendingCounts).reduce((a, b) => a + b, 0);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 pb-28 text-white">
      <div className="mx-auto max-w-7xl">
        <AdminNav />
        <h1 className="text-5xl font-black">All Images</h1>
        <p className="mt-2 text-zinc-400">Browse, filter, approve, reject, and categorize images.</p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4">
          <p className="text-sm text-zinc-300">
            Adding pictures from your computer or phone?
          </p>
          <Link
            href="/admin/upload"
            className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-black text-black hover:bg-amber-300"
          >
            + Add Pictures
          </Link>
        </div>

        {/* Status filter */}
        <div className="mt-6 flex flex-wrap gap-3">
          {[
            { key: "all", label: "All" },
            { key: "pending_review", label: `Pending Review (${totalPending})` },
            { key: "approved", label: "Approved" },
            { key: "rejected", label: "Rejected" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => { setFilterStatus(key); setFilterCategory("all"); }}
              className={"rounded-full px-4 py-2 text-sm font-bold transition " + (filterStatus === key ? "bg-white text-black" : "border border-zinc-700 text-zinc-300 hover:border-amber-400")}>
              {label}
            </button>
          ))}
        </div>

        {/* Category filter: one dropdown listing every category */}
        <div className="mt-4">
          <label htmlFor="category-filter" className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Filter by category</label>
          <select
            id="category-filter"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base font-bold text-white focus:border-amber-400 focus:outline-none sm:w-auto sm:min-w-[22rem]"
          >
            <option value="all">All categories ({totalPending} pending)</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name} · {pendingCounts[c.slug] || 0} pending · {approvedCounts[c.slug] || 0} ✓
              </option>
            ))}
          </select>
        </div>

        {/* Quick helpers: tick everything on this page one way, or clear */}
        {images.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4">
            <span className="text-sm font-bold text-zinc-300">Tick Approve or Reject on each picture, then press Submit.</span>
            <button onClick={() => markAll("approved")} className="rounded-lg border border-green-600 px-3 py-1.5 text-xs font-bold text-green-400">Tick all Approve ({images.length})</button>
            <button onClick={() => markAll("rejected")} className="rounded-lg border border-red-600 px-3 py-1.5 text-xs font-bold text-red-400">Tick all Reject ({images.length})</button>
            {approveCount + rejectCount > 0 && <button onClick={clearMarks} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-bold">Clear ticks</button>}
          </div>
        )}

        {statusMsg && <p className="mt-4 font-bold text-amber-300">{statusMsg}</p>}

        {/* Images loaded note */}
        {!loading && images.length > 0 && (
          <p className="mt-3 text-xs text-zinc-600">Showing up to 200 images. Use category filter to focus on one category at a time.</p>
        )}

        {loading ? (
          <LoadingSpinner message="Loading images..." />
        ) : images.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-8"><p className="text-zinc-400">No images found.</p></div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {images.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                categories={categories}
                approvedCounts={approvedCounts}
                onCategoryChange={handleCategoryChange}
                saving={savingId}
                mark={marks[image.id]}
                onMark={setMark}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky submit bar, always in reach on a phone */}
      {approveCount + rejectCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-700 bg-zinc-950/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <p className="text-sm font-bold">
              <span className="text-green-400">{approveCount} approve</span>
              <span className="text-zinc-500"> · </span>
              <span className="text-red-400">{rejectCount} reject</span>
            </p>
            <button onClick={submitMarks} disabled={bulkSaving} className="rounded-xl bg-amber-400 px-6 py-3 text-base font-black text-black disabled:opacity-60">
              {bulkSaving ? "Saving..." : "Submit"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
