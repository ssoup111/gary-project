"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import FacilityTypeahead from "@/components/order/FacilityTypeahead";
import { useCart, formatPrice } from "@/lib/cart";
import { categoryLabel } from "@/lib/categoryLabel";

type SavedRecipient = {
  id: string;
  full_name: string;
  inmate_number: string | null;
  facility_name: string | null;
  state: string | null;
};

export default function CheckoutPage() {
  const { items, count, totalCents, ready } = useCart();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState("");

  const [fullName, setFullName] = useState("");
  const [inmateNumber, setInmateNumber] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [state, setState] = useState("");

  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // The facility picker is only shown when there is nothing to show yet, or
  // when the customer asks to change it. A saved recipient already carries a
  // facility and state, and re-asking for them reads as the form losing the
  // answer it was just given.
  const [editingFacility, setEditingFacility] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("inmate_contacts")
      .select("id,full_name,inmate_number,facility_name,state")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setSavedRecipients(data || []));
  }, [userId]);

  const images = items.filter((i) => i.item_type === "image");
  const plans = items.filter((i) => i.item_type === "plan");
  const planPictureTotal = plans.reduce((s, i) => s + (i.plan?.image_count || 0), 0);

  function pickSaved(r: SavedRecipient) {
    if (selectedRecipientId === r.id) {
      setSelectedRecipientId("");
      setFullName("");
      setInmateNumber("");
      setFacilityName("");
      setState("");
      setEditingFacility(false);
      return;
    }
    setSelectedRecipientId(r.id);
    setFullName(r.full_name);
    setInmateNumber(r.inmate_number || "");
    setFacilityName(r.facility_name || "");
    setState(r.state || "");
    setEditingFacility(false);
  }

  const facilityKnown = Boolean(facilityName.trim() && state.trim());
  const showFacilityPicker = editingFacility || !facilityKnown;

  async function placeOrder() {
    setStatus("");

    const name = fullName.trim();
    const inmate = inmateNumber.trim();

    if (!name) return setStatus("Please enter your recipient's full name.");
    if (!inmate) return setStatus("Please enter the inmate / offender number.");
    if (!state.trim()) return setStatus("Please choose your recipient's facility.");
    if (!userEmail) return setStatus("Please sign in to place your order.");
    if (count === 0) return setStatus("Your cart is empty.");

    setSubmitting(true);
    setStatus("Sending you to secure payment…");

    // Remember this recipient for next time.
    if (!selectedRecipientId && userId) {
      const dup = savedRecipients.find(
        (r) => r.inmate_number?.toLowerCase() === inmate.toLowerCase()
      );
      if (!dup) {
        await supabase.from("inmate_contacts").insert({
          user_id: userId,
          full_name: name,
          inmate_number: inmate,
          facility_name: facilityName.trim() || null,
          state: state.trim() || null,
        });
      }
    }

    const nameParts = name.split(" ");

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: userEmail,
          items: items.map((i) =>
            i.item_type === "image"
              ? { item_type: "image", imageId: i.image?.id }
              : {
                  item_type: "plan",
                  planSlug: i.plan?.slug,
                  categorySlugs: i.category_slugs,
                }
          ),
          recipientData: {
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            offenderId: inmate,
            facility: facilityName.trim(),
            state: state.trim(),
          },
        }),
      });

      const result = await res.json();
      if (!result.success || !result.url) {
        setSubmitting(false);
        setStatus(result.error || "Checkout failed. Please try again.");
        return;
      }
      window.location.href = result.url;
    } catch {
      setSubmitting(false);
      setStatus("Something went wrong reaching payment. Please try again.");
    }
  }

  /* ---------------- states ---------------- */

  if (!ready || !authChecked) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] px-6 py-16 text-[#0A3161]">
        <div className="mx-auto max-w-4xl">
          <p className="font-bold text-[#A6412B]">Loading checkout…</p>
        </div>
      </main>
    );
  }

  if (count === 0) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] px-6 py-16 text-[#0A3161]">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-black">Your cart is empty</h1>
          <p className="mt-3 text-[#0A3161]/78">Add a few pictures and come back.</p>
          <Link
            href="/catalog"
            className="mt-8 inline-block rounded-2xl bg-[#A6412B] px-8 py-3 font-black text-white hover:bg-[#8C3520]"
          >
            Browse Pictures →
          </Link>
        </div>
      </main>
    );
  }

  if (!userEmail) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] px-6 py-16 text-[#0A3161]">
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-3xl font-black">Sign in to check out</h1>
          <p className="mt-3 text-[#0A3161]/78">
            Your cart is saved — signing in won&apos;t lose it.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/login"
              className="rounded-2xl bg-[#A6412B] px-8 py-3 font-black text-white hover:bg-[#8C3520]"
            >
              Sign In →
            </Link>
            <Link
              href="/signup"
              className="rounded-2xl border border-black/12 px-8 py-3 font-bold hover:border-[#A6412B]"
            >
              Create an Account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F5] px-6 py-12 text-[#0A3161]">
      <div className="mx-auto max-w-5xl">
        <Link href="/cart" className="text-sm font-bold text-[#A6412B] hover:underline">
          ← Back to Cart
        </Link>
        <h1 className="mt-3 text-4xl font-black">Checkout</h1>
        <p className="mt-2 text-[#0A3161]/78">
          Everything in this order goes to one recipient.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Recipient */}
          <section className="rounded-3xl border border-black/10 bg-white p-8">
            <h2 className="text-xl font-black">Who is this going to?</h2>

            {savedRecipients.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#A6412B]">
                  Saved Recipients
                </p>
                <div className="mt-3 grid gap-2">
                  {savedRecipients.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => pickSaved(r)}
                      className={
                        "rounded-xl border p-3 text-left transition " +
                        (selectedRecipientId === r.id
                          ? "border-[#A6412B] bg-[#A6412B]/10"
                          : "border-black/10 hover:border-black/25")
                      }
                    >
                      <p className="text-sm font-black">{r.full_name}</p>
                      <p className="text-xs text-[#0A3161]/78">
                        {[r.inmate_number, r.facility_name, r.state]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#F1F4F9]" />
                  <p className="text-xs text-[#0A3161]/68">or enter someone new</p>
                  <div className="h-px flex-1 bg-[#F1F4F9]" />
                </div>
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#0A3161]/85">
                  Full Name <span className="text-[#A6412B]">*</span>
                </label>
                <input
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setSelectedRecipientId("");
                  }}
                  placeholder="e.g. John Smith"
                  className="mt-2 w-full rounded-xl border border-black/12 bg-white p-3 text-[#0A3161] placeholder:text-[#0A3161]/55"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#0A3161]/85">
                  Inmate / Offender Number <span className="text-[#A6412B]">*</span>
                </label>
                <input
                  value={inmateNumber}
                  onChange={(e) => {
                    setInmateNumber(e.target.value);
                    setSelectedRecipientId("");
                  }}
                  placeholder="e.g. 123456"
                  className="mt-2 w-full rounded-xl border border-black/12 bg-white p-3 text-[#0A3161] placeholder:text-[#0A3161]/55"
                />
              </div>
              {showFacilityPicker ? (
                <>
                  <FacilityTypeahead
                    onSelect={(name, stateCode) => {
                      setFacilityName(name);
                      setState(stateCode);
                      if (name.trim() && stateCode.trim()) setEditingFacility(false);
                    }}
                  />
                  {facilityKnown && (
                    <button
                      type="button"
                      onClick={() => setEditingFacility(false)}
                      className="text-xs font-bold text-[#0A3161]/70 underline hover:text-[#A6412B]"
                    >
                      Cancel
                    </button>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-black/10 bg-[#F1F4F9] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#A6412B]">
                    Facility
                  </p>
                  <p className="mt-1 font-black text-[#0A3161]">{facilityName}</p>
                  <p className="text-xs text-[#0A3161]/72">{state}</p>
                  <button
                    type="button"
                    onClick={() => setEditingFacility(true)}
                    className="mt-2 text-xs font-bold text-[#A6412B] underline"
                  >
                    Change facility
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Summary */}
          <section className="h-fit rounded-3xl border border-black/10 bg-white p-8">
            <h2 className="text-xl font-black">Order Summary</h2>

            <div className="mt-5 space-y-3">
              {images.length > 0 && (
                <div className="flex items-start justify-between gap-3 border-b border-black/10 pb-3">
                  <div>
                    <p className="text-sm font-bold">
                      {images.length} individual picture{images.length === 1 ? "" : "s"}
                    </p>
                    <p className="mt-1 text-xs text-[#0A3161]/68">
                      {images
                        .map((i) => categoryLabel(i.image?.category_slug ?? null))
                        .join(", ")}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-black">
                    {formatPrice(images.reduce((s, i) => s + i.price_cents, 0))}
                  </p>
                </div>
              )}

              {plans.map((item) => {
                const n = item.category_slugs.length;
                const count = item.plan?.image_count || 0;
                const base = n > 0 ? Math.floor(count / n) : 0;
                const remainder = n > 0 ? count % n : 0;
                return (
                  <div
                    key={item.key}
                    className="flex items-start justify-between gap-3 border-b border-black/10 pb-3"
                  >
                    <div>
                      <p className="text-sm font-bold">{item.plan?.name}</p>
                      <p className="mt-1 text-xs text-[#0A3161]/68">
                        {item.category_slugs
                          .map(
                            (slug, i) =>
                              `${categoryLabel(slug)} · ${base + (i < remainder ? 1 : 0)}`
                          )
                          .join(", ")}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-black">
                      {formatPrice(item.price_cents)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <span className="font-bold">Total</span>
              <span className="text-3xl font-black">{formatPrice(totalCents)}</span>
            </div>
            <p className="mt-1 text-xs text-[#0A3161]/68">
              {images.length + planPictureTotal} pictures in total
            </p>

            <button
              type="button"
              onClick={placeOrder}
              disabled={submitting}
              className="mt-6 w-full rounded-2xl bg-[#A6412B] py-4 text-lg font-black text-white hover:bg-[#8C3520] disabled:cursor-not-allowed disabled:bg-black/20"
            >
              {submitting ? "Please wait…" : "Pay Securely →"}
            </button>

            {status && (
              <p className="mt-3 text-sm font-bold text-[#A6412B]">{status}</p>
            )}

            <p className="mt-4 text-xs leading-5 text-[#0A3161]/62">
              Payment is handled by Stripe. Your pictures go into our delivery queue as
              soon as payment clears.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
