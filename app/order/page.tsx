"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import FacilityTypeahead from "@/components/order/FacilityTypeahead";

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

  async function loadRecipients() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data } = await supabase.from("inmate_contacts").select("id,full_name,inmate_number,facility_name,state").eq("user_id", userData.user.id).order("created_at", { ascending: false });
    setSavedRecipients(data || []);
  }

  async function loadCategories() {
    const { data: categoryData } = await supabase.from("categories").select("id,name,slug").eq("is_active", true).order("name");
    setCategories(categoryData || []);

    // Pre-select image from URL if present — no need to load the full grid
    const params = new URLSearchParams(window.location.search);
    const imageIdFromUrl = params.get("imageId");
    if (imageIdFromUrl) {
      const { data: imgData } = await supabase
        .from("generated_images")
        .select("id,prompt,image_url,category_slug")
        .eq("id", imageIdFromUrl)
        .eq("status", "approved")
        .single();
      if (imgData) {
        setImages([imgData]);
        setSelectedImageId(imgData.id);
      }
    }
    setLoading(false);
  }

  async function loadImagesForCategory(categorySlug: string) {
    if (!categorySlug) { setImages([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("generated_images")
      .select("id,prompt,image_url,category_slug")
      .eq("status", "approved")
      .eq("category_slug", categorySlug)
      .order("created_at", { ascending: false });
    if (error) { setStatus("Failed to load images."); }
    setImages(data || []);
    setLoading(false);
  }

  useEffect(() => { loadCategories(); loadRecipients(); }, []);

  useEffect(() => {
    // Only load category images when user picks a category AND no image is pre-selected
    if (selectedCategory && !selectedImageId) {
      loadImagesForCategory(selectedCategory);
    }
  }, [selectedCategory]);

  async function createOrder() {
    if (!selectedImageId) { setStatus("Select an image."); return; }

    // Resolve recipient data — from saved contact or form inputs
    let rName = fullName.trim();
    let rInmate = inmateNumber.trim();
    let rFacility = facilityName.trim();
    let rState = state.trim();

    if (selectedRecipientId) {
      const saved = savedRecipients.find((r) => r.id === selectedRecipientId);
      if (!saved) { setStatus("Selected recipient not found."); return; }
      rName = saved.full_name;
      rInmate = saved.inmate_number || "";
      rFacility = saved.facility_name || "";
      rState = saved.state || "";
    }

    if (!rName) { setStatus("Please provide the recipient's full name."); return; }
    if (!rInmate) { setStatus("Please provide the inmate / offender number."); return; }
    if (!rState) { setStatus("Please provide the recipient's state."); return; }

    setStatus("Creating order...");
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setStatus("Please sign in to place an order."); return; }

    // Split full name into first / last for the recipients table
    const nameParts = rName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Insert into `recipients` — this is what orders and delivery_queue FK to
    const { data: recipientRow, error: recipientError } = await supabase
      .from("recipients")
      .insert({ first_name: firstName, last_name: lastName, offender_id: rInmate, state: rState, facility: rFacility || null })
      .select("id")
      .single();
    if (recipientError || !recipientRow) { setStatus("Failed to save recipient: " + (recipientError?.message || "unknown error")); return; }

    // Also save to inmate_contacts for future use (if entering manually and not a duplicate)
    if (!selectedRecipientId) {
      const duplicate = savedRecipients.find((r) => r.inmate_number?.trim().toLowerCase() === rInmate.toLowerCase());
      if (!duplicate) {
        await supabase.from("inmate_contacts").insert({ user_id: userData.user.id, full_name: rName, inmate_number: rInmate, facility_name: rFacility || null, state: rState || null });
      }
    }

    // Create the order using the recipients.id
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({ recipient_id: recipientRow.id, purchase_type: "single_image", status: "pending", total_cents: 199, customer_email: userData.user.email })
      .select()
      .single();
    if (orderError || !orderData) { setStatus("Failed to create order: " + (orderError?.message || "unknown error")); return; }

    await supabase.from("order_items").insert({ order_id: orderData.id, generated_image_id: selectedImageId, quantity: 1 });
    await supabase.from("delivery_queue").insert({ order_id: orderData.id, recipient_id: recipientRow.id, status: "pending", platform: "Securus/JPay" });

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
              <h2 className="text-2xl font-bold">
                {selectedImageId ? "Image Selected" : "Choose an Image"}
              </h2>
              {selectedImageId && (
                <button onClick={() => { setSelectedImageId(""); setSelectedCategory(""); setImages([]); }} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 hover:border-amber-400">
                  Change Image
                </button>
              )}
            </div>

            {/* Category filter — only shown when no image is pre-selected */}
            {!selectedImageId && categories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setSelectedCategory(selectedCategory === cat.slug ? "" : cat.slug)} className={"rounded-full px-4 py-2 text-sm font-bold transition " + (selectedCategory === cat.slug ? "bg-amber-400 text-black" : "border border-zinc-700 text-zinc-300 hover:border-amber-400")}>{cat.name}</button>
                ))}
              </div>
            )}

            {!selectedImageId && !selectedCategory && (
              <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                <p className="text-zinc-400">Pick a category above to browse images, or{" "}
                  <a href="/catalog" className="text-amber-400 underline hover:text-amber-300">browse the full catalog</a> and click <strong>Select</strong> on any image.
                </p>
              </div>
            )}

            {!selectedImageId && selectedCategory && loading && (
              <div className="mt-6"><LoadingSpinner message="Loading images..." /></div>
            )}

            {!selectedImageId && selectedCategory && !loading && (
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {images.length === 0 ? (
                  <div className="col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-8"><p className="text-zinc-400">No images in this category yet.</p></div>
                ) : images.map((image) => {
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
              <FacilityTypeahead
                onSelect={(name, stateCode) => {
                  setFacilityName(name);
                  setState(stateCode);
                }}
              />
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
