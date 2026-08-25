"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AccountNav() {
  const router = useRouter();
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

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3">
      <Link href="/dashboard" className="rounded-xl border border-black/12 px-4 py-2 text-sm font-bold text-[#0A3161] hover:border-[#B31942]">
        Dashboard
      </Link>
      <Link href="/recipients" className="rounded-xl border border-black/12 px-4 py-2 text-sm font-bold text-[#0A3161] hover:border-[#B31942]">
        Recipients
      </Link>
      <Link href="/my-orders" className="rounded-xl border border-black/12 px-4 py-2 text-sm font-bold text-[#0A3161] hover:border-[#B31942]">
        Orders
      </Link>
      <Link href="/catalog" className="rounded-xl border border-black/12 px-4 py-2 text-sm font-bold text-[#0A3161] hover:border-[#B31942]">
        Catalog
      </Link>
      <button
        type="button"
        onClick={signOut}
        className="rounded-xl bg-[#B31942] px-4 py-2 text-sm font-black text-white"
      >
        Sign Out
      </button>
      {displayName && (
        <span className="ml-2 text-sm font-bold text-[#B31942]">
          👋 {displayName}
        </span>
      )}
    </div>
  );
}
