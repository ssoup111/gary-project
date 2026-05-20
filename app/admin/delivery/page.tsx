"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/admin/AdminNav";
import { supabase } from "@/lib/supabaseClient";

type DeliveryItem = {
  id: string;
  order_id: string;
  recipient_id: string | null;
  status: string | null;
  platform: string | null;
  created_at: string;
};

export default function AdminDeliveryPage() {
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [status, setStatus] = useState("Loading delivery queue...");

  async function loadQueue() {
    const { data, error } = await supabase
      .from("delivery_queue")
      .select("id,order_id,recipient_id,status,platform,created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setStatus(error.message);
      return;
    }

    setItems(data || []);
    setStatus("");
  }

  async function updateDelivery(deliveryId: string, newStatus: string) {
    setStatus("Updating delivery item...");

    const response = await fetch("/api/admin/delivery/update-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deliveryId, status: newStatus }),
    });

    const result = await response.json();

    if (!result.success) {
      setStatus(result.error || "Failed to update delivery item.");
      return;
    }

    setStatus("Delivery item updated.");
    await loadQueue();
  }

  useEffect(() => {
    loadQueue();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <AdminNav />

        <h1 className="text-5xl font-black">Delivery Queue</h1>

        {status ? (
          <p className="mt-6 font-bold text-amber-300">{status}</p>
        ) : items.length === 0 ? (
          <p className="mt-8 text-zinc-400">No delivery queue items yet.</p>
        ) : (
          <div className="mt-10 grid gap-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="font-black">Order #{item.order_id.slice(0, 8)}</p>
                <p className="mt-2 text-sm text-zinc-400">Status: {item.status || "pending"}</p>
                <p className="text-sm text-zinc-400">Platform: {item.platform || "Not set"}</p>
                <p className="text-sm text-zinc-400">
                  Created: {new Date(item.created_at).toLocaleString()}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => updateDelivery(item.id, "in_progress")}
                    className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-black"
                  >
                    In Progress
                  </button>

                  <button
                    type="button"
                    onClick={() => updateDelivery(item.id, "completed")}
                    className="rounded-xl bg-green-500 px-4 py-2 text-sm font-black text-black"
                  >
                    Completed
                  </button>

                  <button
                    type="button"
                    onClick={() => updateDelivery(item.id, "problem")}
                    className="rounded-xl border border-red-800 px-4 py-2 text-sm font-black text-red-300 hover:bg-red-950"
                  >
                    Problem
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
