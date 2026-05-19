"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Order = {
  id: string;
  status: string;
  payment_status: string | null;
  total_cents: number | null;
  created_at: string;
  recipient_id: string | null;
};

type Recipient = {
  id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  inmate_number?: string | null;
  offender_id?: string | null;
  facility_name?: string | null;
  state?: string | null;
};

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [recipients, setRecipients] = useState<Record<string, Recipient>>({});
  const [status, setStatus] = useState("Loading orders...");

  async function loadOrders() {
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("id,status,payment_status,total_cents,created_at,recipient_id")
      .order("created_at", { ascending: false });

    if (orderError) {
      setStatus(orderError.message);
      return;
    }

    const recipientIds = Array.from(
      new Set((orderData || []).map((order) => order.recipient_id).filter(Boolean))
    ) as string[];

    const recipientMap: Record<string, Recipient> = {};

    if (recipientIds.length > 0) {
      const savedRecipients = await supabase
        .from("inmate_contacts")
        .select("id,full_name,inmate_number,facility_name,state")
        .in("id", recipientIds);

      if (savedRecipients.data) {
        savedRecipients.data.forEach((recipient) => {
          recipientMap[recipient.id] = recipient;
        });
      }

      const legacyRecipients = await supabase
        .from("recipients")
        .select("id,first_name,last_name,offender_id,state")
        .in("id", recipientIds);

      if (legacyRecipients.data) {
        legacyRecipients.data.forEach((recipient) => {
          recipientMap[recipient.id] = recipient;
        });
      }
    }

    setRecipients(recipientMap);
    setOrders(orderData || []);
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
        ) : orders.length === 0 ? (
          <p className="mt-8 text-zinc-400">No orders yet.</p>
        ) : (
          <div className="mt-10 grid gap-5">
            {orders.map((order) => {
              const recipient = order.recipient_id
                ? recipients[order.recipient_id]
                : null;

              const recipientName =
                recipient?.full_name ||
                `${recipient?.first_name || ""} ${recipient?.last_name || ""}`.trim() ||
                "Recipient not found";

              const recipientNumber =
                recipient?.inmate_number || recipient?.offender_id || "Not provided";

              return (
                <div
                  key={order.id}
                  className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-black">
                        Order #{order.id.slice(0, 8)}
                      </p>

                      <p className="mt-2 text-sm text-zinc-400">
                        {new Date(order.created_at).toLocaleString()}
                      </p>

                      <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                        <p className="text-sm font-bold uppercase tracking-[0.15em] text-amber-300">
                          Recipient
                        </p>
                        <p className="mt-2 font-black">{recipientName}</p>
                        <p className="mt-1 text-sm text-zinc-400">
                          DOC/Inmate #: {recipientNumber}
                        </p>
                        <p className="text-sm text-zinc-400">
                          Facility: {recipient?.facility_name || "Not provided"}
                        </p>
                        <p className="text-sm text-zinc-400">
                          State: {recipient?.state || "Not provided"}
                        </p>
                      </div>
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
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
