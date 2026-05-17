import { supabase } from "@/lib/supabaseClient";

export default async function OrdersPage() {
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id,purchase_type,status,total_cents,created_at")
    .order("created_at", { ascending: false });

  const { data: deliveries, error: deliveryError } = await supabase
    .from("delivery_queue")
    .select("id,status,platform,notes,created_at,delivered_at")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-5xl font-black">Orders</h1>

        <p className="mt-4 max-w-2xl text-zinc-400">
          Review customer orders and delivery queue status.
        </p>

        {ordersError && (
          <div className="mt-8 rounded-2xl border border-red-900 bg-red-950 p-5 text-red-200">
            Orders error: {ordersError.message}
          </div>
        )}

        <section className="mt-10">
          <h2 className="text-3xl font-bold">Recent Orders</h2>

          {!orders || orders.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
              <p className="text-zinc-400">No orders yet.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5">
              {orders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-bold">{order.purchase_type}</h3>
                      <p className="mt-2 text-sm text-zinc-500">{order.id}</p>
                    </div>

                    <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold uppercase text-amber-300">
                      {order.status}
                    </span>
                  </div>

                  <p className="mt-4 text-zinc-300">
                    Total: ${(order.total_cents / 100).toFixed(2)}
                  </p>

                  <p className="mt-2 text-xs text-zinc-500">
                    Created: {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {deliveryError && (
          <div className="mt-8 rounded-2xl border border-red-900 bg-red-950 p-5 text-red-200">
            Delivery error: {deliveryError.message}
          </div>
        )}

        <section className="mt-16">
          <h2 className="text-3xl font-bold">Delivery Queue</h2>

          {!deliveries || deliveries.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
              <p className="text-zinc-400">No delivery queue items yet.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {deliveries.map((item) => (
                <div key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                  <p className="text-sm uppercase tracking-widest text-zinc-500">
                    Platform
                  </p>

                  <h3 className="mt-2 text-2xl font-bold">
                    {item.platform || "Not selected"}
                  </h3>

                  <p className="mt-4">
                    <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold uppercase text-amber-300">
                      {item.status}
                    </span>
                  </p>

                  {item.notes && (
                    <p className="mt-4 text-sm leading-6 text-zinc-400">
                      {item.notes}
                    </p>
                  )}

                  <p className="mt-5 text-xs text-zinc-500">
                    Created: {new Date(item.created_at).toLocaleString()}
                  </p>

                  {item.delivered_at && (
                    <p className="mt-2 text-xs text-green-400">
                      Delivered: {new Date(item.delivered_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
