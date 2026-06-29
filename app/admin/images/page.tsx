"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminNav from "@/components/admin/AdminNav";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type Category = { id: string; name: string; slug: string; };
type GeneratedImage = { id: string; prompt: string; image_url: string | null; status: string; created_at: string; category_slug: string | null; };

function ImageCard({ image, categories, approvedCounts, onStatusChange, onCategoryChange, saving, selected, onSelect }: {
  image: GeneratedImage;
  categories: Category[];
  approvedCounts: Record<string, number>;
  onStatusChange: (id: string, status: string) => void;
  onCategoryChange: (id: string, slug: string) => void;
  saving: string | null;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
}) {
  const [selectedSlug, setSelectedSlug] = useState(image.category_slug || "");
  const approvedCount = image.category_slug ? (approvedCounts[image.category_slug] ?? 0) : null;

  return (
    <div className={"overflow-hidden rounded-2xl border bg-zinc-900 " + (selected ? "border-amber-400" : "border-zinc-800")}>
      <div className="relative">
        {image.image_url && <img src={image.image_url} alt={image.prompt} className="h-56 w-full object-cover" />}
        {/* Approved count badge */}
        {approvedCount !== null && (
          <span className={"absolute top-2 right-2 rounded-full px-2 py-1 text-xs font-bold " + (approvedCount >= 50 ? "bg-red-600 text-white" : approvedCount >= 20 ? "bg-amber-500 text-black" : "bg-green-600 text-white")}>
            {approvedCount} approved
          </span>
        )}
        {/* Checkbox */}
        <label className="absolute top-2 left-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded border-2 border-white bg-black/50">
          <input type="checkbox" checked={selected} onChange={(e) => onSelect(image.id, e.target.checked)} className="h-4 w-4 accent-amber-400" />
        </label>
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
        <div className="mt-3 flex gap-2">
          <button onClick={() => onStatusChange(image.id, "approved")} className="flex-1 rounded-lg bg-green-500 py-2 text-sm font-bold text-black">Approve</button>
          <button onClick={() => onStatusChange(image.id, "rejected")} className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-bold text-white">Reject</button>
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  async function loadData() {
    setLoading(true);

    const [{ data: categoryData }, { data: approvedSlugs }, { data: pendingSlugs }] = await Promise.all([
      supabase.from("categories").select("id,name,slug").order("name"),
      supabase.from("generated_images").select("category_slug").eq("status", "approved"),
      supabase.from("generated_images").select("category_slug").eq("status", "pending_review"),
    ]);

    setCategories(categoryData || []);

    // Build approved count map
    const aCounts: Record<string, number> = {};
    for (const row of approvedSlugs || []) {
      if (row.category_slug) aCounts[row.category_slug] = (aCounts[row.category_slug] || 0) + 1;
    }
    setApprovedCounts(aCounts);

    // Build pending count map
    const pCounts: Record<string, number> = {};
    for (const row of pendingSlugs || []) {
      if (row.category_slug) pCounts[row.category_slug] = (pCounts[row.category_slug] || 0) + 1;
    }
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
    setSelected(new Set());
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [filterStatus, filterCategory]);

  async function handleStatusChange(imageId: string, newStatus: string) {
    const response = await fetch("/api/admin/images/update-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageId, status: newStatus }) });
    const result = await response.json();
    if (!result.success) { setStatusMsg(result.error || "Update failed."); return; }
    setStatusMsg("Marked as " + newStatus + ".");
    await loadData();
  }

  async function handleCategoryChange(imageId: string, categorySlug: string) {
    setSavingId(imageId);
    const response = await fetch("/api/admin/images/update-category", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageId, categorySlug }) });
    const result = await response.json();
    setSavingId(null);
    if (!result.success) { setStatusMsg(result.error || "Category update failed."); return; }
    setStatusMsg("Category updated.");
    await loadData();
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelected((prev) => { const s = new Set(prev); checked ? s.add(id) : s.delete(id); return s; });
  }

  function selectAll() { setSelected(new Set(images.map((i) => i.id))); }
  function selectNone() { setSelected(new Set()); }

  async function bulkUpdateStatus(newStatus: string) {
    if (selected.size === 0) return;
    setBulkSaving(true);
    const ids = Array.from(selected);
    await Promise.all(ids.map((id) =>
      fetch("/api/admin/images/update-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageId: id, status: newStatus }) })
    ));
    setStatusMsg(`${ids.length} images marked ${newStatus}.`);
    setBulkSaving(false);
    await loadData();
  }

  // Categories with pending images (for the filter pills)
  const categoriesWithPending = useMemo(() => {
    return categories.filter((c) => (pendingCounts[c.slug] || 0) > 0);
  }, [categories, pendingCounts]);

  const totalPending = Object.values(pendingCounts).reduce((a, b) => a + b, 0);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <AdminNav />
        <h1 className="text-5xl font-black">All Images</h1>
        <p className="mt-2 text-zinc-400">Browse, filter, approve, reject, and categorize images.</p>

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

        {/* Category filter — only shown when filtering pending */}
        {filterStatus === "pending_review" && categoriesWithPending.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Filter by category</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterCategory("all")}
                className={"rounded-full px-3 py-1.5 text-xs font-bold transition " + (filterCategory === "all" ? "bg-amber-400 text-black" : "border border-zinc-700 text-zinc-300 hover:border-amber-400")}>
                All categories
              </button>
              {categoriesWithPending.map((c) => {
                const approved = approvedCounts[c.slug] || 0;
                const pending = pendingCounts[c.slug] || 0;
                return (
                  <button key={c.slug} onClick={() => setFilterCategory(c.slug)}
                    className={"rounded-full px-3 py-1.5 text-xs font-bold transition " + (filterCategory === c.slug ? "bg-amber-400 text-black" : "border border-zinc-700 text-zinc-300 hover:border-amber-400")}>
                    {c.name} · {pending} pending · {approved} ✓
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bulk actions */}
        {images.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4">
            <span className="text-sm font-bold text-zinc-300">{selected.size} selected</span>
            <button onClick={selectAll} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-bold hover:border-amber-400">Select All ({images.length})</button>
            {selected.size > 0 && <button onClick={selectNone} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-bold hover:border-amber-400">Clear</button>}
            {selected.size > 0 && (
              <>
                <button onClick={() => bulkUpdateStatus("approved")} disabled={bulkSaving} className="rounded-lg bg-green-500 px-4 py-1.5 text-xs font-black text-black disabled:opacity-60">
                  {bulkSaving ? "Saving..." : `Approve Selected (${selected.size})`}
                </button>
                <button onClick={() => bulkUpdateStatus("rejected")} disabled={bulkSaving} className="rounded-lg bg-red-500 px-4 py-1.5 text-xs font-black text-white disabled:opacity-60">
                  {bulkSaving ? "Saving..." : `Reject Selected (${selected.size})`}
                </button>
              </>
            )}
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
                onStatusChange={handleStatusChange}
                onCategoryChange={handleCategoryChange}
                saving={savingId}
                selected={selected.has(image.id)}
                onSelect={toggleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
