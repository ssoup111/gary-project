"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SiteNav() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null);
      setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-4 py-4 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="text-lg font-black tracking-tight text-amber-300 sm:text-xl">
          Friends Behind Bars
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 text-sm font-bold md:flex">
          <Link href="/catalog" className="hover:text-amber-300">Catalog</Link>
          <Link href="/categories" className="hover:text-amber-300">Categories</Link>
          <Link href="/how-it-works" className="hover:text-amber-300">How It Works</Link>
          <Link href="/faq" className="hover:text-amber-300">FAQ</Link>

          {ready && userEmail ? (
            <>
              <Link href="/my-orders" className="hover:text-amber-300">My Orders</Link>
              <button
                onClick={signOut}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold hover:border-amber-400"
              >
                Sign Out
              </button>
            </>
          ) : ready ? (
            <>
              <Link href="/login" className="hover:text-amber-300">Sign In</Link>
              <Link href="/signup" className="rounded-xl bg-white px-4 py-2 text-sm font-black text-black hover:bg-amber-300">
                Get Started
              </Link>
            </>
          ) : null}
        </nav>

        {/* Mobile menu button */}
        <Link href="/menu" className="rounded-xl bg-white px-4 py-2 text-sm font-black text-black md:hidden">
          Menu
        </Link>
      </div>
    </header>
  );
}
