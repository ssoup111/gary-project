"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AccountNav() {
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="mb-8 flex flex-wrap gap-3">
      <Link href="/dashboard" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 hover:border-amber-400">
        Dashboard
      </Link>
      <Link href="/recipients" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 hover:border-amber-400">
        Recipients
      </Link>
      <Link href="/my-orders" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 hover:border-amber-400">
        Orders
      </Link>
      <Link href="/catalog" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 hover:border-amber-400">
        Catalog
      </Link>
      <button
        type="button"
        onClick={signOut}
        className="rounded-xl bg-white px-4 py-2 text-sm font-black text-black"
      >
        Sign Out
      </button>
    </div>
  );
}
