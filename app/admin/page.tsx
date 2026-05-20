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

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [pendingImages, setPendingImages] = useState<GeneratedImage[]>([]);
  const [approvedImages, setApprovedImages] = useState<GeneratedImage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);

  async function loadData() {
    const { data: categoryData } = await supabase
      .from("categories")
      .select("id,name,slug")
      .eq("is_active", true)
      .order("name");

    setCategories(categoryData || []);

    const { data: pendingData } = await supabase
      .from("generated_images")
      .select("id,prompt,image_url,status,created_at,category_slug")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false });

    setPendingImages(pendingData || []);

    const { data: approvedData } = await supabase
      .from("generated_images")
      .select("id,prompt,image_url,status,created_at,category_slug")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(24);

    setApprovedImages(approvedData || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function generateImage() {
    if (!prompt.trim()) {
      setStatus("Enter a prompt first.");
      return;
    }

    setStatus("Generating image...");

    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, categoryId }),
    });

    const result = await response.json();

    if (!result.success) {
      setStatus(result.error || "Generation failed.");
      return;
    }

    setPrompt("");
    setStatus("Image generated and sent to review queue.");
    await loadData();
  }

  async function updateImageStatus(imageId: string, newStatus: string) {
    setStatus(`Updating image to ${newStatus}...`);

    const response = await fetch("/api/admin/images/update-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageId, status: newStatus }),
    });

    const result = await response.json();

    if (!result.success) {
      setStatus(result.error || "Status update failed.");
      return;
    }

    setStatus(`Image marked as ${newStatus}.`);
    await loadData();
  }

  async function updateImageCategory(imageId: string, categorySlug: string) {
    setSavingCategoryId(imageId);
    setStatus("Updating image category...");

    const response = await fetch("/api/admin/images/update-category", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageId, categorySlug }),
    });

    const result = await response.json();

    if (!result.success) {
      setStatus(result.error || "Category update failed.");
      setSavingCategoryId(null);
      return;
    }

    setStatus("Image category updated.");
    setSavingCategoryId(null);
    await loadData();
  }

  async function regenerateImage(oldPrompt: string) {
    setPrompt(oldPrompt);
    setStatus("Prompt loaded for regeneration. Review it, then click Generate Image.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function CategoryControls({ image }: { image: GeneratedImage }) {
    const [selectedSlug, setSelectedSlug] = useState(image.category_slug || "");

    return (
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
          Catalog Category
        </label>

        <select
          value={selectedSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
          className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-sm text-white"
        >
          <option value="">No category assigned</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => updateImageCategory(image.id, selectedSlug)}
          disabled={savingCategoryId === image.id}
          className="mt-3 rounded-lg bg-amber-400 px-4 py-2 text-sm font-black text-black disabled:opacity-60"
        >
          {savingCategoryId === image.id ? "Saving..." : "Save Category"}
        </button>

        {image.category_slug && (
          <p className="mt-2 text-xs text-amber-300">
            Current slug: {image.category_slug}
          </p>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <AdminNav />

        <h1 className="text-5xl font-bold">Admin Review Queue</h1>

        <p className="mt-4 max-w-2xl text-zinc-400">
          Generate AI images, approve or reject them, and assign approved images to catalog categories.
        </p>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">Generate New Image</h2>

          <label className="mt-6 block text-sm font-bold text-zinc-300">
            Category
          </label>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white"
          >
            <option value="">No category selected</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <label className="mt-6 block text-sm font-bold text-zinc-300">
            Prompt
          </label>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: adult golden retriever sitting in a sunny park, professional catalog photo"
            className="mt-2 min-h-32 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white"
          />

          <p className="mt-3 text-sm text-amber-300">
            Platform rule: no children or minors are allowed in generated images.
          </p>

          <button
            onClick={generateImage}
            className="mt-6 rounded-xl bg-white px-6 py-3 font-bold text-black"
          >
            Generate Image
          </button>

          {status && <p className="mt-4 font-bold text-zinc-300">{status}</p>}
        </section>

        <section className="mt-12">
          <h2 className="text-3xl font-bold">Pending Review</h2>

          {pendingImages.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
              <p className="text-zinc-400">No pending images yet.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pendingImages.map((image) => (
                <div
                  key={image.id}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
                >
                  {image.image_url && (
                    <img
                      src={image.image_url}
                      alt={image.prompt}
                      className="h-72 w-full object-cover"
                    />
                  )}

                  <div className="p-5">
                    <p className="text-sm leading-6 text-zinc-400">
                      {image.prompt}
                    </p>

                    <p className="mt-3 text-xs font-bold uppercase tracking-wider text-amber-400">
                      {image.status}
                    </p>

                    <CategoryControls image={image} />

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        onClick={() => updateImageStatus(image.id, "approved")}
                        className="rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-black"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => updateImageStatus(image.id, "rejected")}
                        className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white"
                      >
                        Reject
                      </button>

                      <button
                        onClick={() => regenerateImage(image.prompt)}
                        className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-bold text-white"
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-16">
          <h2 className="text-3xl font-bold">Recently Approved</h2>

          {approvedImages.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
              <p className="text-zinc-400">No approved images yet.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {approvedImages.map((image) => (
                <div
                  key={image.id}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
                >
                  {image.image_url && (
                    <img
                      src={image.image_url}
                      alt={image.prompt}
                      className="h-56 w-full object-cover"
                    />
                  )}

                  <div className="p-4">
                    <p className="text-xs leading-5 text-zinc-400">
                      {image.prompt}
                    </p>

                    <p className="mt-3 text-xs font-bold uppercase tracking-wider text-green-400">
                      approved
                    </p>

                    <CategoryControls image={image} />
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
