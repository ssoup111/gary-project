"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Category = { id: string; name: string; slug: string };

export default function SiteNav() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    supabase
      .from("categories")
      .select("id,name,slug")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setCategories(data || []));
  }, []);

  // Close the categories dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCategoriesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const navLinkClass =
    "text-sm font-bold text-white/90 transition hover:text-[#A6412B]";

  return (
    <header className="sticky top-0 z-50 bg-[#0A3161] px-4 py-3 text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Logo + company name — left */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2 3 6v6c0 5 3.8 8.7 9 10 5.2-1.3 9-5 9-10V6l-9-4Z"
              fill="#A6412B"
              stroke="#FAF8F5"
              strokeWidth="1"
            />
          </svg>
          <span className="text-lg font-black tracking-tighter text-white sm:text-xl">
            Friends Behind Bars
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {/* Categories dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setCategoriesOpen((v) => !v)}
              className={`flex items-center gap-1.5 ${navLinkClass}`}
              aria-expanded={categoriesOpen}
            >
              Categories
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`h-4 w-4 transition-transform ${categoriesOpen ? "rotate-180" : ""}`}
              >
                <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {categoriesOpen && (
              <div className="absolute left-0 top-full mt-3 w-[560px] max-w-[90vw] rounded-2xl border border-black/5 bg-white p-4 text-[#0A3161] shadow-2xl">
                <div className="grid max-h-96 grid-cols-2 gap-x-6 gap-y-1 overflow-y-auto sm:grid-cols-3">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/catalog?category=${encodeURIComponent(cat.slug)}`}
                      onClick={() => setCategoriesOpen(false)}
                      className="truncate rounded-lg px-2 py-1.5 text-sm font-semibold text-[#0A3161] transition hover:bg-[#A6412B]/10 hover:text-[#A6412B]"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
                <div className="mt-3 border-t border-black/10 pt-3">
                  <Link
                    href="/catalog"
                    onClick={() => setCategoriesOpen(false)}
                    className="text-sm font-black text-[#A6412B] hover:underline"
                  >
                    View Full Catalog →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link href="/pricing" className={navLinkClass}>Subscriptions</Link>
          <Link href="/pricing" className={navLinkClass}>Packages</Link>
          <Link href="/contact" className={navLinkClass}>Contact</Link>
          <Link href="/how-it-works" className={navLinkClass}>About Us</Link>

          <div className="mx-1 h-6 w-px bg-white/20" />

          {ready && userEmail ? (
            <>
              <Link href="/my-orders" className={navLinkClass}>My Orders</Link>
              <button
                onClick={signOut}
                className="rounded-xl border border-white/30 px-4 py-2 text-sm font-bold text-white transition hover:border-[#A6412B] hover:text-[#A6412B]"
              >
                Sign Out
              </button>
            </>
          ) : ready ? (
            <>
              <Link href="/login" className={navLinkClass}>Sign In</Link>
              <Link
                href="/signup"
                className="rounded-xl bg-[#A6412B] px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-[#8C3520]"
              >
                Get Started
              </Link>
            </>
          ) : null}
        </nav>

        {/* Mobile menu button */}
        <Link
          href="/menu"
          className="rounded-xl bg-[#A6412B] px-4 py-2 text-sm font-black text-white md:hidden"
        >
          Menu
        </Link>
      </div>
    </header>
  );
}
