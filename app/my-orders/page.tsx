"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Order = {
  id: string;
  status: string;
  payment_status: string | null;
  total_cents: number | null;
  created_at: string;
};

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("Loading orders...");

  async function loadOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("id,status,payment_status,total_cents,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(error.message);
      return;
    }

    setOrders(data || []);
    setStatus("");
  }

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
          Friends Behind Bars
        </p>

        <h1 className="mt-4 text-5xl font-black">My Orders</h1>

        <p className="mt-4 text-zinc-400">
          View image purchases, payment status, and delivery progress.
        </p>

        {status ? (
          <p className="mt-8 font-bold text-amber-300">{status}</p>
        ) : (
          <div className="mt-10 grid gap-5">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-black">
                      Order #{order.id.slice(0, 8)}
                    </p>

                    <p className="mt-2 text-sm text-zinc-400">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold uppercase tracking-[0.15em] text-amber-300">
                      {order.status}
                    </p>

                    <p className="mt-2 text-sm text-zinc-400">
                      Payment: {order.payment_status || "pending"}
                    </p>

                    <p className="mt-2 text-lg font-black">
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
