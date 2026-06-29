"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function MenuPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null);
    });
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const publicLinks = [
    { label: "Home", href: "/" },
    { label: "Catalog", href: "/catalog" },
    { label: "Categories", href: "/categories" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ];

  const authLinks = userEmail
    ? [
        { label: "My Orders", href: "/my-orders" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Favorites", href: "/favorites" },
      ]
    : [
        { label: "Sign In", href: "/login" },
        { label: "Create Account", href: "/signup" },
      ];

  const legalLinks = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Content Rules", href: "/content-rules" },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">Friends Behind Bars</p>
        <h1 className="mt-4 text-5xl font-black">Menu</h1>

        <div className="mt-10 grid gap-3">
          {publicLinks.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-lg font-black hover:border-amber-400">
              {link.label}
            </Link>
          ))}
        </div>

        <p className="mt-8 text-xs font-bold uppercase tracking-widest text-zinc-500">
          {userEmail ? "Your Account" : "Account"}
        </p>
        <div className="mt-3 grid gap-3">
          {authLinks.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-lg font-black hover:border-amber-400">
              {link.label}
            </Link>
          ))}
          {userEmail && (
            <button onClick={signOut} className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5 text-left text-lg font-black text-zinc-400 hover:border-red-500 hover:text-red-400">
              Sign Out
            </button>
          )}
        </div>

        <p className="mt-8 text-xs font-bold uppercase tracking-widest text-zinc-500">Legal</p>
        <div className="mt-3 grid gap-3">
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm font-bold text-zinc-400 hover:border-amber-400 hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
