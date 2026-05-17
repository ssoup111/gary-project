"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type CatalogImage = {
  id: string;
  prompt: string;
  image_url: string | null;
};

export default function OrderPage() {
  const [images, setImages] = useState<CatalogImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState("");
  const [recipientFirstName, setRecipientFirstName] = useState("");
  const [recipientLastName, setRecipientLastName] = useState("");
  const [offenderId, setOffenderId] = useState("");
  const [state, setState] = useState("");
  const [status, setStatus] = useState("");

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedImageId) || null,
    [images, selectedImageId]
  );

  async function loadImages() {
    const { data, error } = await supabase
      .from("generated_images")
      .select("id,prompt,image_url")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(`Failed to load approved images: ${error.message}`);
      return;
    }

    setImages(data || []);

    const params = new URLSearchParams(window.location.search);
    const imageIdFromUrl = params.get("imageId");

    if (imageIdFromUrl) {
      setSelectedImageId(imageIdFromUrl);
      setStatus("Image selected from catalog.");
    }
  }

  useEffect(() => {
    loadImages();
  }, []);

  async function createOrder() {
    if (!selectedImageId) {
      setStatus("Select an image.");
      return;
    }

    if (!offenderId || !state) {
      setStatus("Recipient information is required.");
      return;
    }

    setStatus("Creating order...");

    const { data: recipientData, error: recipientError } = await supabase
      .from("recipients")
      .insert({
        first_name: recipientFirstName,
        last_name: recipientLastName,
        offender_id: offenderId,
        state,
      })
      .select()
      .single();

    if (recipientError || !recipientData) {
      setStatus(`Failed to create recipient: ${recipientError?.message || "Unknown error"}`);
      return;
    }

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        recipient_id: recipientData.id,
        purchase_type: "single_image",
        status: "pending",
        total_cents: 199,
      })
      .select()
      .single();

    if (orderError || !orderData) {
      setStatus(`Failed to create order: ${orderError?.message || "Unknown error"}`);
      return;
    }

    const { error: itemError } = await supabase.from("order_items").insert({
      order_id: orderData.id,
      generated_image_id: selectedImageId,
      quantity: 1,
    });

    if (itemError) {
      setStatus(`Failed to create order item: ${itemError.message}`);
      return;
    }

    const { error: deliveryError } = await supabase.from("delivery_queue").insert({
      order_id: orderData.id,
      recipient_id: recipientData.id,
      status: "pending",
      platform: "Securus/JPay",
    });

    if (deliveryError) {
      setStatus(`Failed to create delivery queue item: ${deliveryError.message}`);
      return;
    }

    setStatus("Order created. Redirecting to Stripe checkout...");

    const checkoutResponse = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId: orderData.id }),
    });

    const checkoutResult = await checkoutResponse.json();

    if (!checkoutResult.success || !checkoutResult.url) {
      setStatus(checkoutResult.error || "Order created, but Stripe checkout failed.");
      return;
    }

    window.location.href = checkoutResult.url;
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-5xl font-black">Create Order</h1>

        <p className="mt-4 max-w-2xl text-zinc-400">
          Select an approved catalog image and assign it to an incarcerated recipient.
        </p>

        {selectedImage && (
          <section className="mt-8 rounded-3xl border border-green-500/40 bg-green-500/10 p-6">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-green-300">
              Selected Image
            </p>

            <div className="mt-5 grid gap-6 md:grid-cols-[240px_1fr]">
              {selectedImage.image_url && (
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.prompt}
                  className="h-60 w-full rounded-2xl object-cover"
                />
              )}

              <div>
                <p className="text-sm leading-6 text-zinc-300">
                  {selectedImage.prompt}
                </p>

                <a
                  href="/catalog"
                  className="mt-5 inline-block rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 hover:border-amber-400 hover:text-amber-300"
                >
                  Choose Different Image
                </a>
              </div>
            </div>
          </section>
        )}

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <section>
            <h2 className="text-2xl font-bold">Approved Catalog</h2>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {images.map((image) => {
                const isSelected = selectedImageId === image.id;

                return (
                  <div
                    key={image.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedImageId(image.id);
                      setStatus("Image selected.");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setSelectedImageId(image.id);
                        setStatus("Image selected.");
                      }
                    }}
                    className={`cursor-pointer overflow-hidden rounded-3xl border text-left transition ${
                      isSelected
                        ? "border-green-400 bg-zinc-800 ring-4 ring-green-400/30"
                        : "border-zinc-800 bg-zinc-900 hover:border-zinc-500"
                    }`}
                  >
                    {image.image_url && (
                      <img
                        src={image.image_url}
                        alt={image.prompt}
                        className="h-72 w-full object-cover"
                      />
                    )}

                    <div className="p-5">
                      <p className="line-clamp-4 text-sm leading-6 text-zinc-400">
                        {image.prompt}
                      </p>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImageId(image.id);
                          setStatus("Image selected.");
                        }}
                        className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-black ${
                          isSelected
                            ? "bg-green-400 text-black"
                            : "bg-white text-black"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select This Image"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
            <h2 className="text-2xl font-bold">Recipient Information</h2>

            <div className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-zinc-300">
                  First Name
                </label>
                <input
                  value={recipientFirstName}
                  onChange={(e) => setRecipientFirstName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-300">
                  Last Name
                </label>
                <input
                  value={recipientLastName}
                  onChange={(e) => setRecipientLastName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-300">
                  Offender ID
                </label>
                <input
                  value={offenderId}
                  onChange={(e) => setOffenderId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-300">
                  State
                </label>
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white"
                />
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-sm uppercase tracking-widest text-zinc-500">
                  Single Image Price
                </p>
                <p className="mt-2 text-4xl font-black">$1.99</p>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  Includes image assignment and delivery queue creation.
                </p>
              </div>

              <button
                onClick={createOrder}
                className="w-full rounded-2xl bg-white px-6 py-4 text-lg font-black text-black"
              >
                Create Order
              </button>

              {status && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm font-bold text-zinc-300">
                  {status}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
