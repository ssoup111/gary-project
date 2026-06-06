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
};

function DeliveryCard({ item, onUpdate }: { item: DeliveryItem; onUpdate: (id: string, status: string, notes: string) => void }) {
  const notesRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className={"rounded-2xl border bg-zinc-900 p-5 " + (item.status === "completed" ? "border-green-500/30" : item.status === "problem" ? "border-red-500/30" : item.status === "in_progress" ? "border-amber-500/30" : "border-zinc-800")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-black">Order #{item.order_id.slice(0, 8).toUpperCase()}</p>
          <p className="mt-1 text-sm text-zinc-400">Platform: {item.platform || "Not set"}</p>
          <p className="text-sm text-zinc-400">Created: {new Date(item.created_at).toLocaleString()}</p>
        </div>
        <span className={"rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider " + (item.status === "completed" ? "bg-green-500/20 text-green-400" : item.status === "problem" ? "bg-red-500/20 text-red-400" : item.status === "in_progress" ? "bg-amber-500/20 text-amber-400" : "bg-zinc-700 text-zinc-300")}>
          {item.status || "pending"}
        </span>
      </div>

      <textarea
        ref={notesRef}
        defaultValue={item.admin_notes || ""}
        className="mt-4 min-h-20 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm text-white placeholder:text-zinc-600"
        placeholder="Admin delivery notes (optional)"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onUpdate(item.id, "in_progress", notesRef.current?.value || "")} className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-black">In Progress</button>
        <button type="button" onClick={() => onUpdate(item.id, "completed", notesRef.current?.value || "")} className="rounded-xl bg-green-500 px-4 py-2 text-sm font-black text-black">Mark Delivered ✓</button>
        <button type="button" onClick={() => onUpdate(item.id, "problem", notesRef.current?.value || "")} className="rounded-xl border border-red-800 px-4 py-2 text-sm font-black text-red-300 hover:bg-red-950">Problem</button>
      </div>
    </div>
  );
}

export default function AdminDeliveryPage() {
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [filter, setFilter] = useState("all");

  async function loadQueue() {
    setLoading(true);
    let query = supabase.from("delivery_queue").select("id,order_id,recipient_id,status,platform,admin_notes,created_at").order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") query = query.eq("status", filter);
    const { data, error } = await query;
    if (error) { setStatus(error.message); setLoading(false); return; }
    setItems(data || []);
    setLoading(false);
  }

  async function updateDelivery(deliveryId: string, newStatus: string, adminNotes: string) {
    setStatus("Updating...");
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const response = await fetch("/api/admin/delivery/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ deliveryId, status: newStatus, adminNotes }),
    });
    const result = await response.json();
    if (!result.success) { setStatus(result.error || "Update failed."); return; }
    setStatus(newStatus === "completed" ? "Marked delivered — customer notified by email." : "Updated.");
    await loadQueue();
  }

  useEffect(() => { loadQueue(); }, [filter]);

  const filtered = items.filter((i) => filter === "all" ? true : i.status === filter);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <AdminNav />
        <h1 className="text-5xl font-black">Delivery Queue</h1>
        <p className="mt-4 text-zinc-400">Manage image delivery to incarcerated recipients. Marking as delivered notifies the customer by email.</p>

        <div className="mt-8 flex flex-wrap gap-3">
          {["all", "pending", "queued_for_delivery", "in_progress", "completed", "problem"].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={"rounded-full px-4 py-2 text-sm font-bold transition " + (filter === s ? "bg-white text-black" : "border border-zinc-700 text-zinc-300 hover:border-amber-400")}>
              {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>

        {status && <p className="mt-4 font-bold text-amber-300">{status}</p>}

        {loading ? (
          <LoadingSpinner message="Loading delivery queue..." />
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-8"><p className="text-zinc-400">No delivery items found.</p></div>
        ) : (
          <div className="mt-8 grid gap-4">
            {filtered.map((item) => <DeliveryCard key={item.id} item={item} onUpdate={updateDelivery} />)}
          </div>
        )}
      </div>
    </main>
  );
}
