"use client";

import { useEffect, useRef, useState } from "react";
import AdminNav from "@/components/admin/AdminNav";
import { supabase } from "@/lib/supabaseClient";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type DeliveryItem = {
  id: string;
  order_id: string;
  recipient_id: string | null;
  status: string | null;
  platform: string | null;
  admin_notes: string | null;
  created_at: string;
  customerEmail: string | null;
  imageUrl: string | null;
  imagePrompt: string | null;
  recipientName: string | null;
  inmateNumber: string | null;
  facility: string | null;
  state: string | null;
};

function statusColor(s: string | null) {
  if (s === "completed") return "border-green-500/30";
  if (s === "problem") return "border-red-500/30";
  if (s === "in_progress") return "border-amber-500/30";
  return "border-zinc-800";
}

function badgeColor(s: string | null) {
  if (s === "completed") return "bg-green-500/20 text-green-400";
  if (s === "problem") return "bg-red-500/20 text-red-400";
  if (s === "in_progress") return "bg-amber-500/20 text-amber-400";
  return "bg-zinc-700 text-zinc-300";
}

function DeliveryCard({ item, onUpdate }: { item: DeliveryItem; onUpdate: (id: string, status: string, notes: string) => void }) {
  const notesRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className={`rounded-2xl border bg-zinc-900 p-6 ${statusColor(item.status)}`}>
      <div className="flex flex-wrap gap-6">

        {/* Image */}
        {item.imageUrl ? (
          <div className="flex-shrink-0 w-36">
            <img
              src={item.imageUrl}
              alt={item.imagePrompt || "Order image"}
              className="h-44 w-36 rounded-xl object-cover bg-black"
            />
            <a
              href={item.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block rounded-lg bg-amber-400 px-3 py-2 text-center text-xs font-black text-black hover:bg-amber-300"
            >
              ↓ Download for JPay
            </a>
          </div>
        ) : (
          <div className="flex h-44 w-36 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800">
            <span className="text-xs text-zinc-600">No image</span>
          </div>
        )}

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-black text-lg">Order #{item.order_id.slice(0, 8).toUpperCase()}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${badgeColor(item.status)}`}>
              {(item.status || "pending").replace(/_/g, " ")}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">{new Date(item.created_at).toLocaleString()}</p>

          {/* Recipient box — all info needed for JPay */}
          <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-950 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">JPay Recipient Info</p>
            <div className="space-y-1">
              <p className="font-black text-white text-base">{item.recipientName || "Unknown recipient"}</p>
              <p className="text-sm">
                <span className="text-zinc-500">Inmate #: </span>
                <span className="font-bold text-amber-300">{item.inmateNumber || "Not provided"}</span>
              </p>
              <p className="text-sm text-zinc-400">
                {item.facility || "No facility"}{item.state ? `, ${item.state}` : ""}
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-zinc-500">
            Customer: <span className="text-zinc-300">{item.customerEmail || "Not available"}</span>
          </p>
        </div>
      </div>

      {/* Notes */}
      <textarea
        ref={notesRef}
        defaultValue={item.admin_notes || ""}
        className="mt-4 min-h-16 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm text-white placeholder:text-zinc-600"
        placeholder="Notes (optional)"
      />

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-3">
        {item.status !== "in_progress" && item.status !== "completed" && (
          <button
            type="button"
            onClick={() => onUpdate(item.id, "in_progress", notesRef.current?.value || "")}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-black"
          >
            Mark In Progress
          </button>
        )}
        {item.status !== "completed" && (
          <button
            type="button"
            onClick={() => onUpdate(item.id, "completed", notesRef.current?.value || "")}
            className="rounded-xl bg-green-500 px-5 py-2 text-sm font-black text-black"
          >
            ✓ Mark as Sent to JPay
          </button>
        )}
        <button
          type="button"
          onClick={() => onUpdate(item.id, "problem", notesRef.current?.value || "")}
          className="rounded-xl border border-red-800 px-4 py-2 text-sm font-black text-red-300 hover:bg-red-950"
        >
          Problem
        </button>
      </div>
    </div>
  );
}

const FILTERS = ["queued_for_delivery", "in_progress", "completed", "problem", "all"];

export default function AdminDeliveryPage() {
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");
  const [filter, setFilter] = useState("queued_for_delivery");

  async function loadQueue() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const res = await fetch(`/api/admin/delivery/list?status=${filter}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const result = await res.json();
    if (!result.success) { setStatusMsg(result.error || "Failed to load."); setLoading(false); return; }
    setItems(result.items || []);
    setLoading(false);
  }

  async function updateDelivery(deliveryId: string, newStatus: string, adminNotes: string) {
    setStatusMsg("Updating...");
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const response = await fetch("/api/admin/delivery/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ deliveryId, status: newStatus, adminNotes }),
    });
    const result = await response.json();
    if (!result.success) { setStatusMsg(result.error || "Update failed."); return; }
    setStatusMsg(newStatus === "completed" ? "✓ Marked as sent — customer notified by email." : "Updated.");
    await loadQueue();
  }

  useEffect(() => { loadQueue(); }, [filter]);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <AdminNav />

        <h1 className="text-5xl font-black">Fulfillment Queue</h1>
        <p className="mt-4 max-w-2xl text-zinc-400">
          For each paid order: download the image, log into JPay, upload it with the inmate info below, then click{" "}
          <span className="font-bold text-green-400">"Mark as Sent to JPay"</span>. The customer gets an email automatically.
        </p>

        {/* Filter tabs */}
        <div className="mt-8 flex flex-wrap gap-3">
          {FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${filter === s ? "bg-white text-black" : "border border-zinc-700 text-zinc-300 hover:border-amber-400"}`}
            >
              {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>

        {statusMsg && <p className="mt-4 font-bold text-amber-300">{statusMsg}</p>}

        {loading ? (
          <LoadingSpinner message="Loading fulfillment queue..." />
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
            <p className="text-zinc-400">
              {filter === "queued_for_delivery" ? "No orders waiting to be sent. You're all caught up! 🎉" : "No orders in this status."}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5">
            {items.map((item) => (
              <DeliveryCard key={item.id} item={item} onUpdate={updateDelivery} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
