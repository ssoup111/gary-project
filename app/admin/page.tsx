"use client";

import AdminNav from "@/components/admin/AdminNav";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type GeneratedImage = {
  id: string;
  prompt: string;
  image_url: string | null;
  status: string;
  created_at: string;
  category_slug: string | null;
};

type StockPhoto = {
  id: string;
  url: string;
  thumb: string;
  description: string;
  source: "pexels" | "unsplash";
  photographer: string;
};

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [pendingImages, setPendingImages] = useState<GeneratedImage[]>([]);
  const [approvedImages, setApprovedImages] = useState<GeneratedImage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [stockQuery, setStockQuery] = useState("");
  const [stockSource, setStockSource] = useState<"pexels" | "unsplash" | "both">("both");
  const [stockPhotos, setStockPhotos] = useState<StockPhoto[]>([]);
  const [stockStatus, setStockStatus] = useState("");
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [stockCategoryId, setStockCategoryId] = useState("");
  const [stats, setStats] = useState([
    { label: "Pending Review", value: "...", color: "text-amber-400" },
    { label: "Approved Images", value: "...", color: "text-green-400" },
    { label: "Total Orders", value: "...", color: "text-white" },
    { label: "Pending Delivery", value: "...", color: "text-blue-400" },
  ]);

  async function loadData() {
    const { data: categoryData } = await supabase.from("categories").select("id,name,slug").eq("is_active", true).order("name");
    setCategories(categoryData || []);

    // Load dashboard stats
    const [
      { count: pendingCount },
      { count: approvedCount },
      { count: ordersCount },
      { count: deliveryCount },
    ] = await Promise.all([
      supabase.from("generated_images").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
      supabase.from("generated_images").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("delivery_queue").select("*", { count: "exact", head: true }).eq("status", "queued_for_delivery"),
    ]);

    setStats([
      { label: "Pending Review", value: String(pendingCount || 0), color: (pendingCount || 0) > 0 ? "text-amber-400" : "text-green-400" },
      { label: "Approved Images", value: String(approvedCount || 0), color: "text-green-400" },
      { label: "Total Orders", value: String(ordersCount || 0), color: "text-white" },
      { label: "Pending Delivery", value: String(deliveryCount || 0), color: (deliveryCount || 0) > 0 ? "text-blue-400" : "text-green-400" },
    ]);
    const { data: pendingData } = await supabase.from("generated_images").select("id,prompt,image_url,status,created_at,category_slug").eq("status", "pending_review").order("created_at", { ascending: false });
    setPendingImages(pendingData || []);
    const { data: approvedData } = await supabase.from("generated_images").select("id,prompt,image_url,status,created_at,category_slug").eq("status", "approved").order("created_at", { ascending: false }).limit(24);
    setApprovedImages(approvedData || []);
  }

  useEffect(() => { loadData(); }, []);

  async function generateImage() {
    if (!prompt.trim()) { setStatus("Enter a prompt first."); return; }
    setStatus("Generating image...");
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const response = await fetch("/api/generate-image", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ prompt, categoryId }) });
    const result = await response.json();
    if (!result.success) { setStatus(result.error || "Generation failed."); return; }
    setPrompt("");
    setStatus("Image generated and sent to review queue.");
    await loadData();
  }

  async function updateImageStatus(imageId: string, newStatus: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const response = await fetch("/api/admin/images/update-status", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ imageId, status: newStatus }) });
    const result = await response.json();
    if (!result.success) { setStatus(result.error || "Update failed."); return; }
    setStatus(`Image marked as ${newStatus}.`);
    await loadData();
  }

  async function updateImageCategory(imageId: string, categorySlug: string) {
    setSavingCategoryId(imageId);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const response = await fetch("/api/admin/images/update-category", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ imageId, categorySlug }) });
    const result = await response.json();
    setSavingCategoryId(null);
    if (!result.success) { setStatus(result.error || "Category update failed."); return; }
    setStatus("Category updated.");
    await loadData();
  }

  async function searchStockPhotos() {
    if (!stockQuery.trim()) { setStockStatus("Enter a search term first."); return; }
    setStockStatus("Searching...");
    setStockPhotos([]);
    const res = await fetch(`/api/admin/stock-search?query=${encodeURIComponent(stockQuery)}&source=${stockSource}`);
    const result = await res.json();
    if (!result.success) { setStockStatus(result.error || "Search failed."); return; }
    setStockPhotos(result.photos);
    setStockStatus(result.photos.length === 0 ? "No photos found." : `Found ${result.photos.length} photos.`);
  }

  async function importStockPhoto(photo: StockPhoto) {
    setImportingId(photo.id);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const res = await fetch("/api/admin/stock-import", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ imageUrl: photo.url, description: photo.description, source: photo.source, photographer: photo.photographer, categoryId: stockCategoryId || null }) });
    const result = await res.json();
    setImportingId(null);
    if (!result.success) { setStockStatus(result.error || "Import failed."); return; }
    setImportedIds((prev) => new Set([...prev, photo.id]));
    setStockStatus("Photo added to review queue!");
    await loadData();
  }

  function CategoryControls({ image }: { image: GeneratedImage }) {
    const [selectedSlug, setSelectedSlug] = useState(image.category_slug || "");
    return (
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">Catalog Category</label>
        <select value={selectedSlug} onChange={(e) => setSelectedSlug(e.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-sm text-white">
          <option value="">No category assigned</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <button onClick={() => updateImageCategory(image.id, selectedSlug)} disabled={savingCategoryId === image.id} className="mt-3 rounded-lg bg-amber-400 px-4 py-2 text-sm font-black text-black disabled:opacity-60">
          {savingCategoryId === image.id ? "Saving..." : "Save Category"}
        </button>
        {image.category_slug && <p className="mt-2 text-xs text-amber-300">Current: {image.category_slug}</p>}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <AdminNav />
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">{stat.label}</p>
              <p className={"mt-2 text-4xl font-black " + stat.color}>{stat.value}</p>
            </div>
          ))}
        </div>

        <h1 className="text-5xl font-black">Admin Review Queue</h1>
        <p className="mt-4 max-w-2xl text-zinc-400">Generate AI images or import stock photos, then approve them into the catalog.</p>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">Generate AI Image</h2>
          <label className="mt-6 block text-sm font-bold text-zinc-300">Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white">
            <option value="">No category selected</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label className="mt-6 block text-sm font-bold text-zinc-300">Prompt</label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Example: adult golden retriever sitting in a sunny park" className="mt-2 min-h-32 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white" />
          <p className="mt-3 text-sm text-amber-300">No children or minors allowed in generated images.</p>
          <button onClick={generateImage} className="mt-6 rounded-xl bg-white px-6 py-3 font-bold text-black">Generate Image</button>
          {status && <p className="mt-4 font-bold text-zinc-300">{status}</p>}
        </section>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">Import Stock Photos</h2>
          <p className="mt-2 text-sm text-zinc-400">Search Pexels and Unsplash for real photographs.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto_auto]">
            <input value={stockQuery} onChange={(e) => setStockQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchStockPhotos()} placeholder="e.g. golden retriever, mountain sunset" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white placeholder:text-zinc-600" />
            <select value={stockSource} onChange={(e) => setStockSource(e.target.value as "pexels" | "unsplash" | "both")} className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white">
              <option value="both">Both</option>
              <option value="pexels">Pexels</option>
              <option value="unsplash">Unsplash</option>
            </select>
            <button onClick={searchStockPhotos} className="rounded-xl bg-white px-6 py-3 font-bold text-black">Search</button>
          </div>
          <div className="mt-4">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Assign category (optional)</label>
            <select value={stockCategoryId} onChange={(e) => setStockCategoryId(e.target.value)} className="mt-1 block rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm text-white">
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {stockStatus && <p className="mt-4 text-sm font-bold text-zinc-300">{stockStatus}</p>}
          {stockPhotos.length > 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {stockPhotos.map((photo) => {
                const isImported = importedIds.has(photo.id);
                const isImporting = importingId === photo.id;
                return (
                  <div key={photo.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
                    <img src={photo.thumb} alt={photo.description} className="h-48 w-full object-cover" />
                    <div className="p-3">
                      <p className="line-clamp-2 text-xs leading-5 text-zinc-400">{photo.description}</p>
                      <p className="mt-1 text-xs text-zinc-600">by {photo.photographer} • <span className={photo.source === "pexels" ? "text-green-400" : "text-blue-400"}>{photo.source}</span></p>
                      <button onClick={() => importStockPhoto(photo)} disabled={isImporting || isImported} className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-black transition ${isImported ? "bg-green-500/20 text-green-400" : isImporting ? "bg-zinc-700 text-zinc-400" : "bg-white text-black hover:bg-amber-300"}`}>
                        {isImported ? "✓ Added" : isImporting ? "Importing..." : "Add to Queue"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-3xl font-bold">Pending Review</h2>
          {pendingImages.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8"><p className="text-zinc-400">No pending images yet.</p></div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pendingImages.map((image) => (
                <div key={image.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                  {image.image_url && <a href={image.image_url} target="_blank" rel="noopener noreferrer"><img src={image.image_url} alt={image.prompt} className="h-72 w-full object-cover hover:opacity-80 transition" /></a>}
                  <div className="p-5">
                    <p className="text-sm leading-6 text-zinc-300">{image.prompt}</p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-wider text-amber-400">{image.status}</p>
                    <CategoryControls image={image} />
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button onClick={() => updateImageStatus(image.id, "approved")} className="rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-black cursor-pointer">Approve</button>
                      <button onClick={() => updateImageStatus(image.id, "rejected")} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white cursor-pointer">Reject</button>
                      {image.image_url && <a href={image.image_url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-bold text-zinc-300 hover:border-amber-400">View Full ↗</a>}
                    </div>
                    {status && <p className="mt-3 text-sm font-bold text-amber-300">{status}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-16">
          <h2 className="text-3xl font-bold">Recently Approved</h2>
          {approvedImages.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8"><p className="text-zinc-400">No approved images yet.</p></div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {approvedImages.map((image) => (
                <div key={image.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                  {image.image_url && <a href={image.image_url} target="_blank" rel="noopener noreferrer"><img src={image.image_url} alt={image.prompt} className="h-56 w-full object-cover hover:opacity-80 transition" /></a>}
                  <div className="p-4">
                    <p className="text-sm leading-6 text-zinc-300">{image.prompt}</p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-wider text-green-400">approved</p>
                    <CategoryControls image={image} />
                    <div className="mt-3 flex gap-2">
                      {image.image_url && <a href={image.image_url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-zinc-600 px-3 py-1 text-xs font-bold text-zinc-300 hover:border-amber-400">View Full ↗</a>}
                      <button onClick={() => updateImageStatus(image.id, "rejected")} className="rounded-lg border border-zinc-700 px-3 py-1 text-xs font-bold text-red-400 hover:border-red-500">Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}