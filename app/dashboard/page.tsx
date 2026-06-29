"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AccountNav from "@/components/auth/AccountNav";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const email = data.user.email || "";
        const name = data.user.user_metadata?.full_name || email.split("@")[0];
        setDisplayName(name);
      }
    }
    getUser();
  }, []);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <AccountNav />

          <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
            Friends Behind Bars
          </p>

          <h1 className="mt-4 text-5xl font-black">
            {displayName ? `Welcome back, ${displayName}!` : "Customer Dashboard"}
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Browse images, manage recipients, and track your orders.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/catalog" className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 hover:border-amber-400">
              <h2 className="text-xl font-black">Browse Images</h2>
              <p className="mt-3 text-sm text-zinc-400">Choose approved images for delivery.</p>
            </Link>

            <Link href="/my-orders" className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 hover:border-amber-400">
              <h2 className="text-xl font-black">My Orders</h2>
              <p className="mt-3 text-sm text-zinc-400">Track image purchases and delivery status.</p>
            </Link>

            <Link href="/recipients" className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 hover:border-amber-400">
              <h2 className="text-xl font-black">Recipients</h2>
              <p className="mt-3 text-sm text-zinc-400">Save inmate profiles for repeat orders.</p>
            </Link>

            <Link href="/favorites" className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 hover:border-amber-400">
              <h2 className="text-xl font-black">Favorites</h2>
              <p className="mt-3 text-sm text-zinc-400">Saved images you can re-order quickly.</p>
            </Link>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
