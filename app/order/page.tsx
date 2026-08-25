"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import FacilityTypeahead from "@/components/order/FacilityTypeahead";
import Link from "next/link";

type Plan = {
  id: string;
  name: string;
  slug: string;
  plan_type: string;
  description: string;
  image_count: number;
  price_cents: number;
  duration_days: number | null;
  badge: string | null;
  savings_pct: number | null;
};

type CatalogImage = { id: string; prompt: string; image_url: string | null; category_slug: string | null; };
type Category = { id: string; name: string; slug: string; };
type Recipient = { id: string; full_name: string; inmate_number: string | null; facility_name: string | null; state: string | null; };

export default function OrderPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [images, setImages] = useState<CatalogImage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<string[]>([]);
  const [selectedImageId, setSelectedImageId] = useState("");
  const [fullName, setFullName] = useState("");
  const [inmateNumber, setInmateNumber] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [state, setState] = useState("");
  const [status, setStatus] = useState("");
  const [savedRecipients, setSavedRecipients] = useState<Recipient[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"plan" | "details">("plan");

  const selectedImage = useMemo(() => images.find((i) => i.id === selectedImageId) || null, [images, selectedImageId]);
  const individual = useMemo(() => plans.filter((p) => p.plan_type === "individual"), [plans]);
  const packages   = useMemo(() => plans.filter((p) => p.plan_type === "package"), [plans]);
  const subs       = useMemo(() => plans.filter((p) => p.plan_type === "subscription"), [plans]);

  useEffect(() => {
    async function init() {
      // Load plans
      const { data: planData } = await supabase.from("product_plans").select("*").eq("is_active", true).order("sort_order");
      setPlans(planData || []);

      // Load categories
      const { data: catData } = await supabase.from("categories").select("id,name,slug").eq("is_active", true).order("name");
      setCategories(catData || []);

      // Load saved recipients
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: recData } = await supabase.from("inmate_contacts").select("id,full_name,inmate_number,facility_name,state").eq("user_id", userData.user.id).order("created_at", { ascending: false });
        setSavedRecipients(recData || []);
      }

      // Pre-select image + plan from URL
      const params = new URLSearchParams(window.location.search);
      const imageIdFromUrl = params.get("imageId");
      const planSlugFromUrl = params.get("plan");

      if (imageIdFromUrl) {
        const { data: imgData } = await supabase.from("generated_images").select("id,prompt,image_url,category_slug").eq("id", imageIdFromUrl).eq("status", "approved").single();
        if (imgData) { setImages([imgData]); setSelectedImageId(imgData.id); }
      }

      if (planSlugFromUrl && planData) {
        const found = planData.find((p: Plan) => p.slug === planSlugFromUrl);
        if (found) { setSelectedPlan(found); setStep("details"); }
      }

      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (selectedCategory && !selectedImageId) {
      setLoading(true);
      supabase.from("generated_images").select("id,prompt,image_url,category_slug").eq("status", "approved").eq("category_slug", selectedCategory).order("created_at", { ascending: false })
        .then(({ data }) => { setImages(data || []); setLoading(false); });
    }
  }, [selectedCategory]);

  async function handleCheckout() {
    if (!selectedPlan) { setStatus("Please select a plan."); return; }

    // Single image plans need an image selected
    if (selectedPlan.plan_type === "individual" && selectedPlan.image_count === 1 && !selectedImageId) {
      setStatus("Please select an image from the catalog first."); return;
    }

    if ((selectedPlan.plan_type === "package" || selectedPlan.plan_type === "subscription") && selectedCategorySlugs.length === 0) {
      setStatus("Please select at least one category for this plan.");
      return;
    }

    // Resolve recipient
    let rName = fullName.trim();
    let rInmate = inmateNumber.trim();
    let rFacility = facilityName.trim();
    let rState = state.trim();

    if (selectedRecipientId) {
      const saved = savedRecipients.find((r) => r.id === selectedRecipientId);
      if (saved) { rName = saved.full_name; rInmate = saved.inmate_number || ""; rFacility = saved.facility_name || ""; rState = saved.state || ""; }
    }

    if (!rName) { setStatus("Please provide the recipient's full name."); return; }
    if (!rInmate) { setStatus("Please provide the inmate / offender number."); return; }
    if (!rState) { setStatus("Please select the recipient's state/facility."); return; }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setStatus("Please sign in to place an order."); return; }

    // Save to inmate_contacts for future use
    if (!selectedRecipientId) {
      const dup = savedRecipients.find((r) => r.inmate_number?.toLowerCase() === rInmate.toLowerCase());
      if (!dup) {
        await supabase.from("inmate_contacts").insert({ user_id: userData.user.id, full_name: rName, inmate_number: rInmate, facility_name: rFacility || null, state: rState || null });
      }
    }

    const nameParts = rName.split(" ");
    setStatus("Redirecting to checkout...");

    const res = await fetch("/api/checkout/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planSlug: selectedPlan.slug,
        imageId: selectedImageId || null,
        categorySlugs: selectedCategorySlugs,
        customerEmail: userData.user.email,
        recipientData: { firstName: nameParts[0] || "", lastName: nameParts.slice(1).join(" ") || "", offenderId: rInmate, facility: rFacility, state: rState },
      }),
    });

    const result = await res.json();
    if (!result.success || !result.url) { setStatus(result.error || "Checkout failed."); return; }
    window.location.href = result.url;
  }

  if (loading && plans.length === 0) return (
    <main className="min-h-screen bg-white px-6 py-16 text-[#0A3161]">
      <div className="mx-auto max-w-6xl"><LoadingSpinner message="Loading..." /></div>
    </main>
  );

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-[#0A3161]">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#B31942]">Friends Behind Bars</p>
        <h1 className="mt-4 text-5xl font-black">Place an Order</h1>
        <p className="mt-3 text-[#0A3161]/60">Choose a plan, enter your recipient, and check out.</p>

        {/* Step indicator */}
        <div className="mt-8 flex items-center gap-4">
          <button onClick={() => setStep("plan")} className={"flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold " + (step === "plan" ? "bg-[#B31942] text-white" : "border border-black/12 text-[#0A3161]/60 hover:border-[#B31942]")}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/20 text-xs font-black">1</span> Choose Plan
          </button>
          <div className="h-px w-8 bg-black/10" />
          <button onClick={() => selectedPlan && setStep("details")} className={"flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold " + (step === "details" ? "bg-[#B31942] text-white" : "border border-black/12 text-[#0A3161]/60")}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/20 text-xs font-black">2</span> Recipient & Checkout
          </button>
        </div>

        {/* ── STEP 1: Plan Selection ── */}
        {step === "plan" && (
          <div className="mt-10">

            {/* Individual */}
            <h2 className="text-xl font-black text-[#0A3161]">Individual Images</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {individual.map((plan) => (
                <button key={plan.id} onClick={() => { setSelectedPlan(plan); setStep("details"); }}
                  className={"relative rounded-2xl border p-6 text-left transition " + (selectedPlan?.id === plan.id ? "border-[#B31942] bg-[#B31942]/10" : "border-black/10 bg-white hover:border-black/25")}>
                  {plan.badge && <span className="absolute right-4 top-4 rounded-full bg-[#B31942] px-2 py-0.5 text-xs font-black text-white">{plan.badge}</span>}
                  <p className="font-black">{plan.name}</p>
                  <p className="mt-1 text-xs text-[#0A3161]/60">{plan.description}</p>
                  <p className="mt-4 text-2xl font-black">${(plan.price_cents / 100).toFixed(2)}</p>
                  {plan.savings_pct && <p className="text-xs font-bold text-green-700">Save {plan.savings_pct}%</p>}
                </button>
              ))}
            </div>

            {/* Packages */}
            <h2 className="mt-10 text-xl font-black text-[#0A3161]">Image Packages <span className="text-sm font-normal text-[#0A3161]/50">— credits never expire</span></h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {packages.map((plan) => (
                <button key={plan.id} onClick={() => { setSelectedPlan(plan); setStep("details"); }}
                  className={"relative rounded-2xl border p-5 text-left transition " + (selectedPlan?.id === plan.id ? "border-[#B31942] bg-[#B31942]/10" : plan.badge === "Popular" ? "border-[#B31942]/40 bg-[#F1F4F9] hover:border-[#B31942]" : plan.badge === "Best Value" ? "border-green-400/40 bg-[#F1F4F9] hover:border-green-400" : "border-black/10 bg-white hover:border-black/25")}>
                  {plan.badge && <span className={"absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-black " + (plan.badge === "Best Value" ? "bg-green-400 text-black" : "bg-[#B31942] text-white")}>{plan.badge}</span>}
                  <p className="font-black">{plan.name}</p>
                  <p className="mt-3 text-2xl font-black">${(plan.price_cents / 100).toFixed(2)}</p>
                  <p className="text-xs text-[#0A3161]/50">${(plan.price_cents / plan.image_count / 100).toFixed(2)}/image</p>
                  {plan.savings_pct && <p className="text-xs font-bold text-green-700">Save {plan.savings_pct}%</p>}
                </button>
              ))}
            </div>

            {/* Subscriptions */}
            <h2 className="mt-10 text-xl font-black text-[#0A3161]">Daily Subscriptions <span className="text-sm font-normal text-[#0A3161]/50">— 1 image/day, auto-delivered</span></h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {subs.map((plan) => (
                <button key={plan.id} onClick={() => { setSelectedPlan(plan); setStep("details"); }}
                  className={"relative rounded-2xl border p-5 text-left transition " + (selectedPlan?.id === plan.id ? "border-[#B31942] bg-[#B31942]/10" : plan.badge === "Popular" ? "border-[#B31942]/40 bg-[#F1F4F9] hover:border-[#B31942]" : plan.badge === "Best Value" ? "border-green-400/40 bg-[#F1F4F9] hover:border-green-400" : "border-black/10 bg-white hover:border-black/25")}>
                  {plan.badge && <span className={"absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-black " + (plan.badge === "Best Value" ? "bg-green-400 text-black" : "bg-[#B31942] text-white")}>{plan.badge}</span>}
                  <p className="font-black">{plan.name}</p>
                  <p className="mt-1 text-xs text-[#0A3161]/60">{plan.image_count} images total</p>
                  <p className="mt-3 text-2xl font-black">${(plan.price_cents / 100).toFixed(2)}</p>
                  <p className="text-xs text-[#0A3161]/50">${((plan.price_cents / (plan.duration_days || 30)) / 100).toFixed(2)}/day</p>
                </button>
              ))}
            </div>

            <Link href="/pricing" className="mt-8 inline-block text-sm text-[#B31942] underline hover:text-[#B31942]">
              View full pricing details →
            </Link>
          </div>
        )}

        {/* ── STEP 2: Recipient + Checkout ── */}
        {step === "details" && selectedPlan && (
          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_420px]">

            {/* Left: image picker (only for single image) */}
            {selectedPlan.plan_type === "individual" && selectedPlan.image_count === 1 && (
              <section>
                <h2 className="text-2xl font-bold">
                  {selectedImageId ? "Image Selected" : "Choose an Image"}
                </h2>
                {selectedImage ? (
                  <div className="mt-4 rounded-3xl border border-green-500/40 bg-green-500/10 p-5">
                    <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                      {selectedImage.image_url && <img src={selectedImage.image_url} alt={selectedImage.prompt} className="max-h-56 w-full rounded-2xl object-contain bg-black" />}
                      <div>
                        <p className="text-sm text-[#0A3161]/70 line-clamp-4">{selectedImage.prompt}</p>
                        <button onClick={() => { setSelectedImageId(""); setSelectedCategory(""); setImages([]); }} className="mt-4 rounded-xl border border-black/12 px-4 py-2 text-sm font-bold hover:border-[#B31942]">Change Image</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-[#0A3161]/60">Pick a category, or <Link href="/catalog" className="text-[#B31942] underline">browse the full catalog</Link> and click Select on any image.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <button key={cat.id} onClick={() => setSelectedCategory(selectedCategory === cat.slug ? "" : cat.slug)}
                          className={"rounded-full px-3 py-1.5 text-xs font-bold transition " + (selectedCategory === cat.slug ? "bg-[#B31942] text-white" : "border border-black/12 text-[#0A3161]/70 hover:border-[#B31942]")}>
                          {cat.name}
                        </button>
                      ))}
                    </div>
                    {selectedCategory && loading && <div className="mt-4"><LoadingSpinner message="Loading images..." /></div>}
                    {selectedCategory && !loading && (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        {images.map((img) => (
                          <div key={img.id} role="button" tabIndex={0} onClick={() => setSelectedImageId(img.id)}
                            className={"cursor-pointer overflow-hidden rounded-2xl border transition " + (selectedImageId === img.id ? "border-green-400 ring-2 ring-green-400/30" : "border-black/10 hover:border-black/25")}>
                            {img.image_url && <img src={img.image_url} alt={img.prompt} className="w-full object-contain bg-black max-h-48" />}
                            <div className="p-3">
                              <p className="line-clamp-2 text-xs text-[#0A3161]/60">{img.prompt}</p>
                              <button className={"mt-2 w-full rounded-lg py-1.5 text-xs font-black " + (selectedImageId === img.id ? "bg-green-400 text-black" : "bg-[#B31942] text-white")}>
                                {selectedImageId === img.id ? "Selected ✓" : "Select"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>
            )}

            {/* For packages/subs — just show what they bought */}
            {(selectedPlan.plan_type === "package" || selectedPlan.plan_type === "subscription") && (
              <section>
                <h2 className="text-2xl font-bold">Choose Categories</h2>
                <div className="mt-4 rounded-2xl border border-black/10 bg-white p-6">
                  <p className="text-lg font-black">{selectedPlan.name}</p>
                  <p className="mt-2 text-[#0A3161]/60">{selectedPlan.description}</p>

                  <div className="mt-6">
                    <p className="mb-3 text-sm font-bold text-[#B31942]">Select one or more categories</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => {
                        const active = selectedCategorySlugs.includes(cat.slug);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategorySlugs((current) =>
                                active ? current.filter((slug) => slug !== cat.slug) : [...current, cat.slug]
                              );
                            }}
                            className={"rounded-full px-3 py-1.5 text-xs font-bold transition " + (active ? "bg-[#B31942] text-white" : "border border-black/12 text-[#0A3161]/70 hover:border-[#B31942]")}
                          >
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                    {selectedCategorySlugs.length > 0 && (
                      <p className="mt-3 text-xs font-bold text-green-700">
                        Selected: {selectedCategorySlugs.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="mt-6 space-y-3 text-sm text-[#0A3161]/70">
                    <p>✓ {selectedPlan.image_count} images total</p>
                    {selectedPlan.plan_type === "subscription" && <p>✓ 1 new image delivered to your recipient every day</p>}
                    {selectedPlan.plan_type === "package" && <p>✓ Credits never expire — use at your own pace</p>}
                    <p>✓ All images reviewed and approved</p>
                    <p>✓ Delivered to your recipient's facility account</p>
                  </div>
                  <p className="mt-6 text-3xl font-black">${(selectedPlan.price_cents / 100).toFixed(2)}</p>
                </div>
                <button onClick={() => setStep("plan")} className="mt-4 text-sm text-[#B31942] underline hover:text-[#B31942]">← Change plan</button>
              </section>
            )}

            {/* Right: Recipient info + checkout */}
            <section className="rounded-3xl border border-black/10 bg-white p-8">
              {/* Selected plan summary */}
              <div className="mb-6 rounded-2xl border border-[#B31942]/30 bg-[#B31942]/10 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#B31942]">Selected Plan</p>
                <p className="mt-1 font-black">{selectedPlan.name}</p>
                <p className="text-sm text-[#0A3161]/60">${(selectedPlan.price_cents / 100).toFixed(2)} · {selectedPlan.image_count} image{selectedPlan.image_count !== 1 ? "s" : ""}</p>
                <button onClick={() => setStep("plan")} className="mt-2 text-xs text-[#B31942] underline">Change</button>
              </div>

              <h2 className="text-xl font-bold">Recipient Information</h2>

              {savedRecipients.length > 0 && (
                <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#B31942]">Saved Recipients</p>
                  <div className="mt-3 grid gap-2">
                    {savedRecipients.map((r) => (
                      <button key={r.id} onClick={() => {
                        if (selectedRecipientId === r.id) {
                          setSelectedRecipientId("");
                          setFullName(""); setInmateNumber(""); setFacilityName(""); setState("");
                        } else {
                          setSelectedRecipientId(r.id);
                          setFullName(r.full_name);
                          setInmateNumber(r.inmate_number || "");
                          setFacilityName(r.facility_name || "");
                          setState(r.state || "");
                        }
                      }}
                        className={"rounded-xl border p-3 text-left transition " + (selectedRecipientId === r.id ? "border-green-400 bg-green-400/10" : "border-black/10 hover:border-black/25")}>
                        <p className="font-black text-sm">{r.full_name}</p>
                        <p className="text-xs text-[#0A3161]/60">{r.inmate_number} · {r.facility_name} · {r.state}</p>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-3"><div className="h-px flex-1 bg-[#F1F4F9]" /><p className="text-xs text-[#0A3161]/45">or enter manually</p><div className="h-px flex-1 bg-[#F1F4F9]" /></div>
                </div>
              )}

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#0A3161]/70">Full Name <span className="text-[#B31942]">*</span></label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. John Smith" className="mt-2 w-full rounded-xl border border-black/12 bg-white p-3 text-[#0A3161] placeholder:text-[#0A3161]/45" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#0A3161]/70">Inmate / Offender Number <span className="text-[#B31942]">*</span></label>
                  <input value={inmateNumber} onChange={(e) => setInmateNumber(e.target.value)} placeholder="e.g. 123456" className="mt-2 w-full rounded-xl border border-black/12 bg-white p-3 text-[#0A3161] placeholder:text-[#0A3161]/45" />
                </div>
                <FacilityTypeahead onSelect={(name, stateCode) => { setFacilityName(name); setState(stateCode); }} />
              </div>

              <button onClick={handleCheckout} className="mt-6 w-full rounded-2xl bg-[#B31942] px-6 py-4 text-lg font-black text-white hover:bg-[#8f1434]">
                Proceed to Checkout →
              </button>
              {status && <p className="mt-3 text-sm font-bold text-[#B31942]">{status}</p>}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
