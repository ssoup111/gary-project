"use client";

import { useEffect, useState } from "react";
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

export default function MyOrdersPage() {
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");

  const [orders, setOrders] = useState<Order[]>([]);
  const [recipients, setRecipients] = useState<Record<string, Recipient>>({});
  const [images, setImages] = useState<Record<string, CatalogImage>>({});
  const [loading, setLoading] = useState(true);
  const [notSignedIn, setNotSignedIn] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");

  async function loadOrders() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setNotSignedIn(true);
      setLoading(false);
      return;
    }

    const userEmail = userData.user.email;

    // Query orders directly by customer_email
    const { data: orderData, error } = await supabase
      .from("orders")
      .select("id,status,payment_status,delivery_status,total_cents,created_at,recipient_id")
      .eq("customer_email", userEmail)
      .order("created_at", { ascending: false });

    if (error) {
      setStatusMsg("Error loading orders: " + error.message);
      setLoading(false);
      return;
    }

    const ordersList = orderData || [];

    // Fetch recipients from the recipients table
    const recipientIds = Array.from(
      new Set(ordersList.map((o) => o.recipient_id).filter(Boolean))
    ) as string[];

    const recipientMap: Record<string, Recipient> = {};
    if (recipientIds.length > 0) {
      const { data: recipientData } = await supabase
        .from("recipients")
        .select("id,first_name,last_name,offender_id,facility,state")
        .in("id", recipientIds);
      (recipientData || []).forEach((r) => { recipientMap[r.id] = r; });
    }

    // Fetch images via order_items
    const orderIds = ordersList.map((o) => o.id);
    const imageMap: Record<string, CatalogImage> = {};
    if (orderIds.length > 0) {
      const { data: itemsData } = await supabase
        .from("order_items")
        .select("order_id,generated_image_id")
        .in("order_id", orderIds);

      const imageIds = Array.from(
        new Set((itemsData || []).map((i) => i.generated_image_id).filter(Boolean))
      ) as string[];

      if (imageIds.length > 0) {
        const { data: imagesData } = await supabase
          .from("generated_images")
          .select("id,prompt,image_url")
          .in("id", imageIds);

        (itemsData || []).forEach((item) => {
          const img = (imagesData || []).find((i) => i.id === item.generated_image_id);
          if (img) imageMap[item.order_id] = img;
        });
      }
    }

    setRecipients(recipientMap);
    setImages(imageMap);
    setOrders(ordersList);
    setLoading(false);
  }

  async function retryPayment(orderId: string) {
    setRetryingId(orderId);
    setStatusMsg("Opening Stripe checkout...");
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const result = await response.json();
    setRetryingId(null);
    if (!result.success || !result.url) {
      setStatusMsg(result.error || "Failed to open checkout.");
      return;
    }
    window.location.href = result.url;
  }

  useEffect(() => { loadOrders(); }, []);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">Friends Behind Bars</p>
        <h1 className="mt-4 text-5xl font-black">My Orders</h1>
        <p className="mt-4 text-zinc-400">View image purchases, payment status, and delivery progress.</p>

        {paymentStatus === "success" && (
          <div className="mt-8 rounded-2xl border border-green-500/40 bg-green-500/10 p-5">
            <p className="text-lg font-black text-green-300">Payment successful!</p>
            <p className="mt-1 text-sm text-green-200/70">Your order has been placed and the image will be delivered to your recipient. We'll process it shortly.</p>
          </div>
        )}

        {paymentStatus === "cancelled" && (
          <div className="mt-8 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
            <p className="font-bold text-amber-300">Payment cancelled — no charge was made.</p>
            <p className="mt-1 text-sm text-amber-200/70">You can retry payment below or <Link href="/order" className="underline">create a new order</Link>.</p>
          </div>
        )}

        {statusMsg && (
          <div className="mt-6 rounded-2xl border border-zinc-700 bg-zinc-900 p-4 font-bold text-zinc-300">{statusMsg}</div>
        )}

        {notSignedIn ? (
          <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-10">
            <p className="text-xl font-bold">Sign in to view your orders</p>
            <Link href="/login" className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-black text-black">Sign In</Link>
          </div>
        ) : loading ? (
          <LoadingSpinner message="Loading your orders..." />
        ) : orders.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-10">
            <p className="text-xl font-bold">No orders yet</p>
            <p className="mt-3 text-zinc-400">Browse the catalog and create your first order.</p>
            <Link href="/catalog" className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-black text-black">Browse Catalog</Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-5">
            {orders.map((order) => {
              const recipient = order.recipient_id ? recipients[order.recipient_id] : null;
              const recipientName = recipient
                ? [recipient.first_name, recipient.last_name].filter(Boolean).join(" ")
                : "Unknown";
              const image = images[order.id];
              const isPending =
                !order.payment_status ||
                order.payment_status === "pending" ||
                order.payment_status === "unpaid";

              return (
                <div
                  key={order.id}
                  className={"rounded-3xl border bg-zinc-900 p-6 " + (isPending ? "border-amber-500/40" : "border-zinc-800")}
                >
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
                      <p className="mt-2 text-sm text-zinc-400">{new Date(order.created_at).toLocaleString()}</p>
                      {image && (
                        <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-300">{image.prompt}</p>
                      )}
                      <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                        <p className="text-sm font-bold uppercase tracking-[0.15em] text-amber-300">Recipient</p>
                        <p className="mt-2 font-black">{recipientName}</p>
                        <p className="mt-1 text-sm text-zinc-400">Inmate #: {recipient?.offender_id || "Not provided"}</p>
                        <p className="text-sm text-zinc-400">Facility: {recipient?.facility || "Not provided"}</p>
                        <p className="text-sm text-zinc-400">State: {recipient?.state || "Not provided"}</p>
                      </div>
                    </div>

                    <div className="text-left lg:text-right">
                      <span className={"inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider " + (order.payment_status === "paid" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400")}>
                        {order.payment_status === "paid" ? "Paid" : "Payment Pending"}
                      </span>
                      <p className="mt-3 text-sm text-zinc-400">{order.delivery_status || order.status}</p>
                      <p className="mt-2 text-2xl font-black">${((order.total_cents || 0) / 100).toFixed(2)}</p>
                      {isPending && (
                        <button
                          onClick={() => retryPayment(order.id)}
                          disabled={retryingId === order.id}
                          className="mt-4 w-full rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-black disabled:opacity-60 lg:w-auto"
                        >
                          {retryingId === order.id ? "Opening..." : "Complete Payment →"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
