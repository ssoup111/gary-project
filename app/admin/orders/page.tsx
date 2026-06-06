"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/admin/AdminNav";
import { supabase } from "@/lib/supabaseClient";

type Order = {
  id: string;
  status: string | null;
  payment_status: string | null;
  delivery_status: string | null;
  total_cents: number | null;
  created_at: string;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("Loading orders...");

  async function loadOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("id,status,payment_status,delivery_status,total_cents,created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setStatus(error.message);
      return;
    }

    setOrders(data || []);
    setStatus("");
  }

  async function updateOrder(orderId: string, newStatus: string, deliveryStatus: string) {
    setStatus("Updating order...");

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch("/api/admin/orders/update-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        orderId,
        status: newStatus,
        deliveryStatus,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      setStatus(result.error || "Failed to update order.");
      return;
    }

    setStatus("Order updated.");
    await loadOrders();
  }

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <AdminNav />

        <h1 className="text-5xl font-black">Admin Orders</h1>

        {status && <p className="mt-6 font-bold text-amber-300">{status}</p>}

        {orders.length === 0 ? (
          <p className="mt-8 text-zinc-400">No orders yet.</p>
        ) : (
          <div className="mt-10 grid gap-4">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex flex-wrap justify-between gap-4">
                  <div>
                    <p className="font-black">Order #{order.id.slice(0, 8)}</p>
                    <p className="mt-2 text-sm text-zinc-400">
                      {new Date(order.created_at).toLocaleString()}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => updateOrder(order.id, "paid", "queued_for_delivery")}
                        className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-black"
                      >
                        Queue Delivery
                      </button>

                      <button
                        type="button"
                        onClick={() => updateOrder(order.id, "completed", "delivered")}
                        className="rounded-xl bg-green-500 px-4 py-2 text-sm font-black text-black"
                      >
                        Mark Delivered
                      </button>

                      <button
                        type="button"
                        onClick={() => updateOrder(order.id, "cancelled", "cancelled")}
                        className="rounded-xl border border-red-800 px-4 py-2 text-sm font-black text-red-300 hover:bg-red-950"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  <div className="text-right text-sm">
                    <p>Status: {order.status || "pending"}</p>
                    <p>Payment: {order.payment_status || "pending"}</p>
                    <p>Delivery: {order.delivery_status || "pending"}</p>
                    <p className="mt-2 font-black">
                      ${((order.total_cents || 0) / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
