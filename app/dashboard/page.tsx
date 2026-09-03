"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AccountNav from "@/components/auth/AccountNav";
import { supabase } from "@/lib/supabaseClient";
import { isAdminEmail } from "@/lib/adminEmails";

export default function DashboardPage() {
  const [displayName, setDisplayName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const email = data.user.email || "";
        const name = data.user.user_metadata?.full_name || email.split("@")[0];
        setDisplayName(name);

        // Admins get a way into the review queue from here. Without it the
        // only route to /admin is typing the address.
        if (isAdminEmail(email)) {
          setIsAdmin(true);
          const { count } = await supabase
            .from("generated_images")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending_review");
          setPendingCount(count ?? 0);
        }
      }
    }
    getUser();
  }, []);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#FAF8F5] px-6 py-16 text-[#0A3161]">
        <div className="mx-auto max-w-6xl">
          <AccountNav />

          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#A6412B]">
            Friends Behind Bars
          </p>

          <h1 className="mt-4 text-5xl font-black">
            {displayName ? `Welcome back, ${displayName}!` : "Customer Dashboard"}
          </h1>

          <p className="mt-4 max-w-2xl text-[#0A3161]/78">
            Browse images, manage recipients, and track your orders.
          </p>

          {isAdmin && (
            <div className="mt-8 rounded-3xl border-2 border-[#0A3161] bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[#A6412B]">
                    Administrator
                  </p>
                  <p className="mt-1 text-xl font-black">
                    {pendingCount === null
                      ? "Image review"
                      : pendingCount === 0
                      ? "No images waiting for review"
                      : `${pendingCount} image${pendingCount === 1 ? "" : "s"} waiting for your review`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/admin/images"
                    className="rounded-xl bg-[#A6412B] px-5 py-2.5 text-sm font-black text-white hover:bg-[#8C3520]"
                  >
                    Review Images →
                  </Link>
                  <Link
                    href="/admin"
                    className="rounded-xl border border-black/12 px-5 py-2.5 text-sm font-bold hover:border-[#A6412B]"
                  >
                    Admin Home
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/catalog" className="rounded-3xl border border-black/10 bg-white p-6 hover:border-[#A6412B]">
              <h2 className="text-xl font-black">Browse Images</h2>
              <p className="mt-3 text-sm text-[#0A3161]/78">Choose approved images for delivery.</p>
            </Link>

            <Link href="/my-orders" className="rounded-3xl border border-black/10 bg-white p-6 hover:border-[#A6412B]">
              <h2 className="text-xl font-black">My Orders</h2>
              <p className="mt-3 text-sm text-[#0A3161]/78">Track image purchases and delivery status.</p>
            </Link>

            <Link href="/recipients" className="rounded-3xl border border-black/10 bg-white p-6 hover:border-[#A6412B]">
              <h2 className="text-xl font-black">Recipients</h2>
              <p className="mt-3 text-sm text-[#0A3161]/78">Save inmate profiles for repeat orders.</p>
            </Link>

            <Link href="/favorites" className="rounded-3xl border border-black/10 bg-white p-6 hover:border-[#A6412B]">
              <h2 className="text-xl font-black">Favorites</h2>
              <p className="mt-3 text-sm text-[#0A3161]/78">Saved images you can re-order quickly.</p>
            </Link>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
