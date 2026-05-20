import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Order = {
  id: string;
  status: string | null;
  payment_status: string | null;
  delivery_status: string | null;
  total_cents: number | null;
  created_at: string;
};

export default async function AdminOrdersPage() {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id,status,payment_status,delivery_status,total_cents,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap gap-3">
          <Link href="/admin" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-black text-white hover:border-amber-400">Review Queue</Link>
          <Link href="/admin/images" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-black text-white hover:border-amber-400">Images</Link>
          <Link href="/admin/orders" className="rounded-xl bg-white px-4 py-2 text-sm font-black text-black">Orders</Link>
          <Link href="/admin/facilities" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-black text-white hover:border-amber-400">Facilities</Link>
          <Link href="/admin/checklist" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-black text-white hover:border-amber-400">Launch Checklist</Link>
        </div>

        <h1 className="text-5xl font-black">Admin Orders</h1>

        {error ? (
          <p className="mt-8 text-red-300">{error.message}</p>
        ) : !orders || orders.length === 0 ? (
          <p className="mt-8 text-zinc-400">No orders yet.</p>
        ) : (
          <div className="mt-10 grid gap-4">
            {orders.map((order: Order) => (
              <div key={order.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex flex-wrap justify-between gap-4">
                  <div>
                    <p className="font-black">Order #{order.id.slice(0, 8)}</p>
                    <p className="mt-2 text-sm text-zinc-400">{new Date(order.created_at).toLocaleString()}</p>
                  </div>

                  <div className="text-right text-sm">
                    <p>Status: {order.status || "pending"}</p>
                    <p>Payment: {order.payment_status || "pending"}</p>
                    <p>Delivery: {order.delivery_status || "pending"}</p>
                    <p className="mt-2 font-black">${((order.total_cents || 0) / 100).toFixed(2)}</p>
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
