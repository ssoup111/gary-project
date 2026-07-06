"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type Order = {
  id: string;
  status: string;
  payment_status: string | null;
  delivery_status: string | null;
  total_cents: number | null;
  created_at: string;
  recipient_id: string | null;
  purchase_type: string | null;
  plan_id: string | null;
};

type Subscription = {
  id: string;
  plan_name: string | null;
  status: string | null;
  images_remaining: number | null;
  images_total: number | null;
  start_date: string | null;
  end_date: string | null;
  next_delivery_date: string | null;
  created_at: string;
  recipient_id: string | null;
};

type Recipient = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  offender_id: string | null;
  facility: string | null;
  state: string | null;
};

type CatalogImage = {
  id: string;
  prompt: string;
  image_url: string | null;
};

function fmt(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function MyOrdersContent() {
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");

  const [tab, setTab] = useState<"orders" | "subscriptions">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [recipients, setRecipients] = useState<Record<string, Recipient>>({});
  const [images, setImages] = useState<Record<string, CatalogImage>>({});
  const [loading, setLoading] = useState(true);
  const [notSignedIn, setNotSignedIn] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  async function loadData() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setNotSignedIn(true); setLoading(false); return; }

    const userEmail = userData.user.email;

    // Load orders + subscriptions in parallel
    const [orderRes, subRes] = await Promise.all([
      supabase.from("orders").select("id,status,payment_status,delivery_status,total_cents,created_at,recipient_id,purchase_type,plan_id")
        .eq("customer_email", userEmail).order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("id,plan_name,status,images_remaining,images_total,start_date,end_date,next_delivery_date,created_at,recipient_id")
        .eq("customer_email", userEmail).order("created_at", { ascending: false }),
    ]);

    const ordersList: Order[] = orderRes.data || [];
    const subsList: Subscription[] = subRes.data || [];

    // Collect all recipient IDs
    const allRecipientIds = Array.from(new Set([
      ...ordersList.map((o) => o.recipient_id),
      ...subsList.map((s) => s.recipient_id),
    ].filter(Boolean))) as string[];

    const recipientMap: Record<string, Recipient> = {};
    if (allRecipientIds.length > 0) {
      const { data: recs } = await supabase.from("recipients").select("id,first_name,last_name,offender_id,facility,state").in("id", allRecipientIds);
      (recs || []).forEach((r) => { recipientMap[r.id] = r; });
    }

    // Fetch images via order_items for individual orders
    const orderIds = ordersList.filter((o) => o.purchase_type === "individual" || !o.purchase_type).map((o) => o.id);
    const imageMap: Record<string, CatalogImage> = {};
    if (orderIds.length > 0) {
      const { data: itemsData } = await supabase.from("order_items").select("order_id,generated_image_id").in("order_id", orderIds);
      const imageIds = Array.from(new Set((itemsData || []).map((i) => i.generated_image_id).filter(Boolean))) as string[];
      if (imageIds.length > 0) {
        const { data: imagesData } = await supabase.from("generated_images").select("id,prompt,image_url").in("id", imageIds);
        (itemsData || []).forEach((item) => {
          const img = (imagesData || []).find((i) => i.id === item.generated_image_id);
          if (img) imageMap[item.order_id] = img;
        });
      }
    }

    setOrders(ordersList);
    setSubscriptions(subsList);
    setRecipients(recipientMap);
    setImages(imageMap);
    setLoading(false);

    // Auto-switch to subscriptions tab if user has subs but no individual orders
    if (subsList.length > 0 && ordersList.filter((o) => o.purchase_type === "individual").length === 0) {
      setTab("subscriptions");
    }
  }

  useEffect(() => { loadData(); }, []);

  const individualOrders = orders.filter((o) => o.purchase_type === "individual" || !o.purchase_type);

  function RecipientCard({ recipientId }: { recipientId: string | null }) {
    const rec = recipientId ? recipients[recipientId] : null;
    if (!rec) return null;
    const name = [rec.first_name, rec.last_name].filter(Boolean).join(" ");
    return (
      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Recipient</p>
        <p className="mt-1 font-black">{name || "—"}</p>
        {rec.offender_id && <p className="text-xs text-zinc-400">Inmate #: {rec.offender_id}</p>}
        {rec.facility && <p className="text-xs text-zinc-400">Facility: {rec.facility}</p>}
        {rec.state && <p className="text-xs text-zinc-400">State: {rec.state}</p>}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">Friends Behind Bars</p>
        <h1 className="mt-4 text-5xl font-black">My Orders</h1>
        <p className="mt-3 text-zinc-400">Your image purchases, package credits, and subscription plans.</p>

        {paymentStatus === "success" && (
          <div className="mt-8 rounded-2xl border border-green-500/40 bg-green-500/10 p-5">
            <p className="text-lg font-black text-green-300">Payment successful!</p>
            <p className="mt-1 text-sm text-green-200/70">Your order has been confirmed. Check below for your plan details.</p>
          </div>
        )}
        {paymentStatus === "cancelled" && (
          <div className="mt-8 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
            <p className="font-bold text-amber-300">Payment cancelled — no charge was made.</p>
            <p className="mt-1 text-sm text-amber-200/70">You can <Link href="/order" className="underline">start a new order</Link> anytime.</p>
          </div>
        )}
        {statusMsg && <div className="mt-6 rounded-2xl border border-zinc-700 bg-zinc-900 p-4 font-bold text-zinc-300">{statusMsg}</div>}

        {notSignedIn ? (
          <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-10">
            <p className="text-xl font-bold">Sign in to view your orders</p>
            <Link href="/login" className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-black text-black">Sign In</Link>
          </div>
        ) : loading ? (
          <LoadingSpinner message="Loading your orders..." />
        ) : (orders.length === 0 && subscriptions.length === 0) ? (
          <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-10">
            <p className="text-xl font-bold">No orders yet</p>
            <p className="mt-3 text-zinc-400">Browse the catalog and create your first order.</p>
            <div className="mt-6 flex gap-4">
              <Link href="/catalog" className="rounded-xl bg-white px-6 py-3 font-black text-black hover:bg-amber-300">Browse Catalog</Link>
              <Link href="/pricing" className="rounded-xl border border-zinc-700 px-6 py-3 font-black text-white hover:border-amber-400">View Pricing</Link>
            </div>
          </div>
        ) : (
          <>
            {/* Tab switcher */}
            <div className="mt-8 flex gap-3">
              <button onClick={() => setTab("orders")}
                className={"rounded-full px-5 py-2 text-sm font-black transition " + (tab === "orders" ? "bg-white text-black" : "border border-zinc-700 text-zinc-400 hover:border-amber-400")}>
                Images ({individualOrders.length})
              </button>
              <button onClick={() => setTab("subscriptions")}
                className={"rounded-full px-5 py-2 text-sm font-black transition " + (tab === "subscriptions" ? "bg-white text-black" : "border border-zinc-700 text-zinc-400 hover:border-amber-400")}>
                Plans & Packages ({subscriptions.length})
              </button>
            </div>

            {/* Individual orders tab */}
            {tab === "orders" && (
              <div className="mt-6 grid gap-5">
                {individualOrders.length === 0 ? (
                  <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-10 text-center">
                    <p className="font-bold text-zinc-400">No single-image orders yet</p>
                    <Link href="/catalog" className="mt-4 inline-block rounded-xl bg-white px-6 py-3 font-black text-black">Browse Catalog</Link>
                  </div>
                ) : individualOrders.map((order) => {
                  const image = images[order.id];
                  const isPending = !order.payment_status || order.payment_status === "pending" || order.payment_status === "unpaid";
                  return (
                    <div key={order.id} className={"rounded-3xl border bg-zinc-900 p-6 " + (isPending ? "border-amber-500/40" : "border-zinc-800")}>
                      <div className="grid gap-6 lg:grid-cols-[180px_1fr_auto]">
                        <div>
                          {image?.image_url ? (
                            <a href={image.image_url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                              <img src={image.image_url} alt={image.prompt} className="h-44 w-full object-contain" />
                            </a>
                          ) : (
                            <div className="flex h-44 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-500">No image</div>
                          )}
                        </div>
                        <div>
                          <p className="text-lg font-black">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="mt-1 text-xs text-zinc-500">{new Date(order.created_at).toLocaleString()}</p>
                          {image && <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-300">{image.prompt}</p>}
                          <RecipientCard recipientId={order.recipient_id} />
                        </div>
                        <div className="text-left lg:text-right">
                          <span className={"inline-block rounded-full px-3 py-1 text-xs font-bold uppercase " + (order.payment_status === "paid" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400")}>
                            {order.payment_status === "paid" ? "Paid" : "Payment Pending"}
                          </span>
                          <p className="mt-2 text-xs text-zinc-500">{order.delivery_status || order.status}</p>
                          <p className="mt-3 text-2xl font-black">${((order.total_cents || 0) / 100).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Subscriptions / packages tab */}
            {tab === "subscriptions" && (
              <div className="mt-6 grid gap-5">
                {subscriptions.length === 0 ? (
                  <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-10 text-center">
                    <p className="font-bold text-zinc-400">No packages or subscriptions yet</p>
                    <Link href="/pricing" className="mt-4 inline-block rounded-xl bg-white px-6 py-3 font-black text-black">View Plans</Link>
                  </div>
                ) : subscriptions.map((sub) => {
                  const isDaily = !!sub.next_delivery_date || (sub.plan_name || "").includes("subscription") || (sub.plan_name || "").includes("day");
                  const usedPct = sub.images_total ? Math.round(((sub.images_total - (sub.images_remaining || 0)) / sub.images_total) * 100) : 0;
                  const statusColors: Record<string, string> = {
                    active: "bg-green-500/20 text-green-400",
                    paused: "bg-amber-500/20 text-amber-400",
                    cancelled: "bg-red-500/20 text-red-400",
                    completed: "bg-zinc-700 text-zinc-400",
                  };
                  const statusColor = statusColors[sub.status || ""] || "bg-zinc-800 text-zinc-500";
                  return (
                    <div key={sub.id} className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-black capitalize">{(sub.plan_name || "Package").replace(/-/g, " ")}</p>
                          <p className="mt-1 text-xs text-zinc-500">{isDaily ? "Daily delivery plan" : "Image credits"} · Started {fmt(sub.start_date)}</p>
                        </div>
                        <span className={"rounded-full px-3 py-1 text-xs font-black uppercase " + statusColor}>{sub.status || "active"}</span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-6">
                        <div className="flex items-end justify-between text-sm">
                          <p className="font-bold text-zinc-300">Images Remaining</p>
                          <p className="font-black"><span className="text-amber-400 text-xl">{sub.images_remaining ?? "?"}</span><span className="text-zinc-600">/{sub.images_total}</span></p>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-zinc-800">
                          <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${100 - usedPct}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-zinc-600">{usedPct}% used</p>
                      </div>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div>
                          {isDaily && sub.next_delivery_date && (
                            <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
                              <p className="text-xs font-bold text-amber-300">Next Delivery</p>
                              <p className="mt-1 font-black">{fmt(sub.next_delivery_date)}</p>
                            </div>
                          )}
                          {sub.end_date && (
                            <p className="mt-2 text-xs text-zinc-500">Plan expires: {fmt(sub.end_date)}</p>
                          )}
                        </div>
                        <div>
                          <RecipientCard recipientId={sub.recipient_id} />
                        </div>
                      </div>

                      {!isDaily && (sub.images_remaining || 0) > 0 && (
                        <Link href={`/order?plan=single`} className="mt-5 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-black text-black hover:bg-amber-300">
                          Use a Credit →
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function MyOrdersPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-zinc-950 px-6 py-16 text-white"><p className="text-zinc-400">Loading...</p></main>}>
      <MyOrdersContent />
    </Suspense>
  );
}
