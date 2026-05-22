"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminNav from "@/components/admin/AdminNav";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type Category = { id: string; name: string; slug: string; };
type GeneratedImage = { id: string; prompt: string; image_url: string | null; status: string; created_at: string; category_slug: string | null; };

function ImageCard({ image, categories, onStatusChange, onCategoryChange, saving }: {
  image: GeneratedImage;
  categories: Category[];
  onStatusChange: (id: string, status: string) => void;
  onCategoryChange: (id: string, slug: string) => void;
  saving: string | null;
}) {
  const [selectedSlug, setSelectedSlug] = useState(image.category_slug || "");

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      {image.image_url && <img src={image.image_url} alt={image.prompt} className="h-56 w-full object-cover" />}
      <div className="p-5">
        <p className="text-sm leading-6 text-zinc-300">{image.prompt}</p>
        <span className={"mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider " + (image.status === "approved" ? "bg-green-500/20 text-green-400" : image.status === "rejected" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400")}>
          {image.status}
        </span>
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Category</label>
          <select value={selectedSlug} onChange={(e) => setSelectedSlug(e.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-sm text-white">
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
          <button onClick={() => onCategoryChange(image.id, selectedSlug)} disabled={saving === image.id} className="mt-3 rounded-lg bg-amber-400 px-4 py-2 text-sm font-black text-black disabled:opacity-60">
            {saving === image.id ? "Saving..." : "Save Category"}
          </button>
          {image.category_slug && <p className="mt-2 text-xs text-amber-300">Current: {image.category_slug}</p>}
        </div>
        <div className="mt-4 flex gap-3">
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
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [status, setStatus] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const { data: categoryData } = await supabase.from("categories").select("id,name,slug").eq("is_active", true).order("name");
    setCategories(categoryData || []);
    let query = supabase.from("generated_images").select("id,prompt,image_url,status,created_at,category_slug").order("created_at", { ascending: false });
    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    const { data } = await query;
    setImages(data || []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [filterStatus]);

  async function handleStatusChange(imageId: string, newStatus: string) {
    const response = await fetch("/api/admin/images/update-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageId, status: newStatus }) });
    const result = await response.json();
    if (!result.success) { setStatus(result.error || "Update failed."); return; }
    setStatus("Marked as " + newStatus + ".");
    await loadData();
  }

  async function handleCategoryChange(imageId: string, categorySlug: string) {
    setSavingId(imageId);
    const response = await fetch("/api/admin/images/update-category", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageId, categorySlug }) });
    const result = await response.json();
    setSavingId(null);
    if (!result.success) { setStatus(result.error || "Category update failed."); return; }
    setStatus("Category updated.");
    await loadData();
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <AdminNav />
        <h1 className="text-5xl font-black">All Images</h1>
        <p className="mt-4 text-zinc-400">Browse, filter, approve, reject, and categorize images.</p>

        <div className="mt-8 flex flex-wrap gap-3">
          {["all", "pending_review", "approved", "rejected"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={"rounded-full px-4 py-2 text-sm font-bold transition " + (filterStatus === s ? "bg-white text-black" : "border border-zinc-700 text-zinc-300 hover:border-amber-400")}>
              {s === "all" ? "All" : s === "pending_review" ? "Pending Review" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {status && <p className="mt-4 font-bold text-amber-300">{status}</p>}

        {loading ? (
          <LoadingSpinner message="Loading images..." />
        ) : images.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-8"><p className="text-zinc-400">No images found.</p></div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image) => (
              <ImageCard key={image.id} image={image} categories={categories} onStatusChange={handleStatusChange} onCategoryChange={handleCategoryChange} saving={savingId} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
