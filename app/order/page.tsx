"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type CatalogImage = {
  id: string;
  prompt: string;
  image_url: string | null;
  category_slug: string | null;
};

type Recipient = {
  id: string;
  full_name: string;
  inmate_number: string | null;
  facility_name: string | null;
  state: string | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

export default function OrderPage() {
  const [images, setImages] = useState<CatalogImage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedImageId, setSelectedImageId] = useState("");
  const [fullName, setFullName] = useState("");
  const [inmateNumber, setInmateNumber] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [state, setState] = useState("");
  const [status, setStatus] = useState("");
  const [savedRecipients, setSavedRecipients] = useState<Recipient[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [loading, setLoading] = useState(true);

  const selectedImage = useMemo(() => images.find((i) => i.id === selectedImageId) || null, [images, selectedImageId]);
  const filteredImages = useMemo(() => !selectedCategory ? images : images.filter((i) => i.category_slug === selectedCategory), [images, selectedCategory]);

  async function loadRecipients() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data } = await supabase.from("inmate_contacts").select("id,full_name,inmate_number,facility_name,state").eq("user_id", userData.user.id).order("created_at", { ascending: false });
    setSavedRecipients(data || []);
  }

  async function loadImages() {
    const { data: categoryData } = await supabase.from("categories").select("id,name,slug").eq("is_active", true).order("name");
    setCategories(categoryData || []);
    const { data, error } = await supabase.from("generated_images").select("id,prompt,image_url,category_slug").eq("status", "approved").order("created_at", { ascending: false });
    if (error) { setStatus("Failed to load images."); setLoading(false); return; }
    setImages(data || []);
    setLoading(false);
    const params = new URLSearchParams(window.location.search);
    const imageIdFromUrl = params.get("imageId");
    if (imageIdFromUrl) { setSelectedImageId(imageIdFromUrl); setStatus("Image selected from catalog."); }
  }

  useEffect(() => { loadImages(); loadRecipients(); }, []);

  async function createOrder() {
    if (!selectedImageId) { setStatus("Select an image."); return; }
    if (!selectedRecipientId && (!fullName.trim() || !inmateNumber.trim())) { setStatus("Please select a saved recipient or fill in Full Name and Inmate Number."); return; }
    setStatus("Creating order...");
    const { data: userData } = await supabase.auth.getUser();
    let recipientId: string;
    if (selectedRecipientId) {
      recipientId = selectedRecipientId;
    } else {
      const duplicate = savedRecipients.find((r) => r.inmate_number?.trim().toLowerCase() === inmateNumber.trim().toLowerCase());
      if (duplicate) { setStatus("Inmate number " + inmateNumber + " already exists: " + duplicate.full_name + ". Select them from saved recipients above."); return; }
      const { data: insertedRecipient, error: recipientError } = await supabase.from("inmate_contacts").insert({ user_id: userData.user?.id || null, full_name: fullName.trim(), inmate_number: inmateNumber.trim(), facility_name: facilityName.trim() || null, state: state.trim() || null }).select("id").single();
      if (recipientError || !insertedRecipient) { setStatus("Failed to save recipient: " + recipientError?.message); return; }
      recipientId = insertedRecipient.id;
    }
    const { data: orderData, error: orderError } = await supabase.from("orders").insert({ recipient_id: recipientId, purchase_type: "single_image", status: "pending", total_cents: 199 }).select().single();
    if (orderError || !orderData) { setStatus("Failed to create order."); return; }
    await supabase.from("order_items").insert({ order_id: orderData.id, generated_image_id: selectedImageId, quantity: 1 });
    await supabase.from("delivery_queue").insert({ order_id: orderData.id, recipient_id: recipientId, status: "pending", platform: "Securus/JPay" });
    setStatus("Redirecting to Stripe checkout...");
    const checkoutResponse = await fetch("/api/create-checkout-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: orderData.id }) });
    const checkoutResult = await checkoutResponse.json();
    if (!checkoutResult.success || !checkoutResult.url) { setStatus(checkoutResult.error || "Stripe checkout failed."); return; }
    window.location.href = checkoutResult.url;
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-5xl font-black">Create Order</h1>
        <p className="mt-4 max-w-2xl text-zinc-400">Select an approved catalog image and assign it to an incarcerated recipient.</p>

        {selectedImage && (
          <section className="mt-8 rounded-3xl border border-green-500/40 bg-green-500/10 p-6">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-green-300">Selected Image</p>
            <div className="mt-5 grid gap-6 md:grid-cols-[240px_1fr]">
              {selectedImage.image_url && <img src={selectedImage.image_url} alt={selectedImage.prompt} className="max-h-[420px] w-full rounded-2xl object-contain bg-black" />}
              <div>
                <p className="text-sm leading-6 text-zinc-300">{selectedImage.prompt}</p>
                <a href="/catalog" className="mt-5 inline-block rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 hover:border-amber-400">Choose Different Image</a>
              </div>
            </div>
          </section>
        )}

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <section>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">Approved Catalog</h2>
              {!loading && <span className="text-sm text-zinc-500">{filteredImages.length} image{filteredImages.length !== 1 ? "s" : ""}</span>}
            </div>

            {!loading && categories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setSelectedCategory("")} className={"rounded-full px-4 py-2 text-sm font-bold transition " + (!selectedCategory ? "bg-white text-black" : "border border-zinc-700 text-zinc-300 hover:border-amber-400")}>All</button>
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setSelectedCategory(selectedCategory === cat.slug ? "" : cat.slug)} className={"rounded-full px-4 py-2 text-sm font-bold transition " + (selectedCategory === cat.slug ? "bg-amber-400 text-black" : "border border-zinc-700 text-zinc-300 hover:border-amber-400")}>{cat.name}</button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="mt-6"><LoadingSpinner message="Loading catalog..." /></div>
            ) : (
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {filteredImages.length === 0 ? (
                  <div className="col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-8"><p className="text-zinc-400">No images in this category yet.</p></div>
                ) : filteredImages.map((image) => {
                  const isSelected = selectedImageId === image.id;
                  return (
                    <div key={image.id} role="button" tabIndex={0} onClick={() => { setSelectedImageId(image.id); setStatus("Image selected."); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedImageId(image.id); }} className={"cursor-pointer overflow-hidden rounded-3xl border text-left transition " + (isSelected ? "border-green-400 bg-zinc-800 ring-4 ring-green-400/30" : "border-zinc-800 bg-zinc-900 hover:border-zinc-500")}>
                      {image.image_url && <a href={image.image_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="block cursor-zoom-in bg-black"><img src={image.image_url} alt={image.prompt} className="w-full object-contain bg-black" /></a>}
                      <div className="p-5">
                        <p className="line-clamp-4 text-sm leading-6 text-zinc-400">{image.prompt}</p>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedImageId(image.id); setStatus("Image selected."); }} className={"mt-5 w-full rounded-xl px-4 py-3 text-sm font-black " + (isSelected ? "bg-green-400 text-black" : "bg-white text-black")}>{isSelected ? "Selected" : "Select This Image"}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
            <h2 className="text-2xl font-bold">Recipient Information</h2>
            {savedRecipients.length > 0 && (
              <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300">Saved Recipients</p>
                <div className="mt-4 grid gap-3">
                  {savedRecipients.map((recipient) => (
                    <button key={recipient.id} type="button" onClick={() => setSelectedRecipientId(selectedRecipientId === recipient.id ? "" : recipient.id)} className={"rounded-2xl border p-4 text-left transition " + (selectedRecipientId === recipient.id ? "border-green-400 bg-green-400/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-600")}>
                      <p className="font-black">{recipient.full_name}</p>
                      <p className="mt-1 text-sm text-zinc-400">{recipient.inmate_number || "No inmate number"}</p>
                      <p className="text-sm text-zinc-400">{recipient.facility_name || "No facility"} - {recipient.state || "No state"}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-800" />
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{savedRecipients.length > 0 ? "Or enter manually" : "Enter recipient"}</p>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>
            <div className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-zinc-300">Full Name <span className="text-amber-400">*</span></label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. John Smith" className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white placeholder:text-zinc-600" />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-300">Inmate / Offender Number <span className="text-amber-400">*</span></label>
                <input value={inmateNumber} onChange={(e) => setInmateNumber(e.target.value)} placeholder="e.g. 123456" className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white placeholder:text-zinc-600" />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-300">Facility Name</label>
                <input value={facilityName} onChange={(e) => setFacilityName(e.target.value)} placeholder="e.g. Stateville Correctional Center" className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white placeholder:text-zinc-600" />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-300">State</label>
                <input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Illinois" className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white placeholder:text-zinc-600" />
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-sm uppercase tracking-widest text-zinc-500">Single Image Price</p>
                <p className="mt-2 text-4xl font-black">$1.99</p>
              </div>
              <button onClick={createOrder} className="w-full rounded-2xl bg-white px-6 py-4 text-lg font-black text-black">Create Order</button>
              {status && <div className={"rounded-2xl border p-4 text-sm font-bold " + (status.startsWith("Inmate number") ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-zinc-800 bg-zinc-950 text-zinc-300")}>{status}</div>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
