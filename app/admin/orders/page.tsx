"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/admin/AdminNav";
import { supabase } from "@/lib/supabaseClient";

type OrderItem = {
  id: string;
  generated_images?: { image_url: string; prompt: string } | { image_url: string; prompt: string }[];
};

type Order = {
  id: string;
  customer_email: string | null;
  status: string | null;
  payment_status: string | null;
  delivery_status: string | null;
  total_cents: number | null;
  created_at: string;
  order_items?: OrderItem[];
  recipient?: {
    first_name: string;
    last_name: string;
    offender_id: string;
    facility: string;
    state: string;
  } | null;
};

function firstImageUrl(order: Order): string | null {
  const items = order.order_items;
  if (!Array.isArray(items) || items.length === 0) return null;
  const img = items[0]?.generated_images;
  if (!img) return null;
  const imgObj = Array.isArray(img) ? img[0] : img;
  return imgObj?.image_url || null;
}

const STATUS_COLORS: Record<string, string> = {
  paid: "text-green-400",
  pending: "text-amber-400",
  completed: "text-green-400",
  cancelled: "text-red-400",
  refunded: "text-red-400",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusMsg, setStatusMsg] = useState("Loading orders...");
  const [filter, setFilter] = useState("all");

  async function loadOrders(statusFilter = filter) {
    setStatusMsg("Loading orders...");
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) { setStatusMsg("Not authenticated."); return; }

    const res = await fetch(`/api/admin/orders/list?status=${statusFilter}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    if (!result.success) {
      setStatusMsg(result.error || "Failed to load orders.");
      return;
    }
    setOrders(result.orders || []);
    setStatusMsg("");
  }

  async function updateOrder(orderId: string, newStatus: string, deliveryStatus: string) {
    setStatusMsg("Updating...");
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch("/api/admin/orders/update-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ orderId, status: newStatus, deliveryStatus }),
    });

    const result = await res.json();
    if (!result.success) { setStatusMsg(result.error || "Failed to update."); return; }
    setStatusMsg("Updated.");
    await loadOrders();
  }

  useEffect(() => { loadOrders(); }, []);

  const tabs = ["all", "pending", "paid", "completed", "cancelled"];

  function handleTabChange(tab: string) {
    setFilter(tab);
    loadOrders(tab);
  }

  const total = orders.reduce((sum, o) => sum + (o.total_cents || 0), 0);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <AdminNav />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-5xl font-black">Orders</h1>
          {orders.length > 0 && (
            <p className="text-sm text-zinc-400">
              {orders.length} orders · <span className="font-black text-white">${(total / 100).toFixed(2)}</span> total
            </p>
          )}
        </div>

        {/* Filter tabs */}
        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-bold capitalize ${
                filter === tab
                  ? "bg-amber-400 text-black"
                  : "border border-zinc-700 text-zinc-400 hover:border-amber-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {statusMsg && <p className="mt-6 font-bold text-amber-300">{statusMsg}</p>}

        {!statusMsg && orders.length === 0 && (
          <p className="mt-8 text-zinc-400">No orders found.</p>
        )}

        <div className="mt-8 grid gap-4">
          {orders.map((order) => {
            const imageUrl = firstImageUrl(order);
            const recipientName = order.recipient
              ? [order.recipient.first_name, order.recipient.last_name].filter(Boolean).join(" ")
              : null;

            return (
              <div key={order.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex flex-wrap gap-4">
                  {/* Thumbnail */}
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="Order image"
                      className="h-16 w-16 rounded-xl object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}

                  <div className="flex flex-1 flex-wrap justify-between gap-4">
                    <div>
                      <p className="font-black">Order #{order.id.slice(0, 8)}</p>
                      <p className="mt-1 text-sm text-zinc-400">{order.customer_email || "—"}</p>
                      {recipientName && (
                        <p className="mt-1 text-sm text-zinc-400">
                          → {recipientName}
                          {order.recipient?.facility ? `, ${order.recipient.facility}` : ""}
                          {order.recipient?.state ? ` (${order.recipient.state})` : ""}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-zinc-500">
                        {new Date(order.created_at).toLocaleString()}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => updateOrder(order.id, "paid", "queued_for_delivery")}
                          className="rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-black text-black"
                        >
                          Queue Delivery
                        </button>
                        <button
                          onClick={() => updateOrder(order.id, "completed", "delivered")}
                          className="rounded-xl bg-green-500 px-3 py-1.5 text-xs font-black text-black"
                        >
                          Mark Delivered
                        </button>
                        <button
                          onClick={() => updateOrder(order.id, "cancelled", "cancelled")}
                          className="rounded-xl border border-red-800 px-3 py-1.5 text-xs font-black text-red-300 hover:bg-red-950"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>

                    <div className="text-right text-xs text-zinc-400">
                      <p>Status: <span className={STATUS_COLORS[order.status || ""] || ""}>{order.status || "pending"}</span></p>
                      <p>Payment: <span className={STATUS_COLORS[order.payment_status || ""] || ""}>{order.payment_status || "pending"}</span></p>
                      <p>Delivery: {order.delivery_status || "pending"}</p>
                      <p className="mt-2 text-base font-black text-white">
                        ${((order.total_cents || 0) / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
