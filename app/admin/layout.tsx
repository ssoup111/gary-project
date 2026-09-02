"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/**
 * Who can open /admin. Comma-separated, so more than one account can be an
 * administrator without a code change. The fallback keeps the original
 * address working if the variable is ever missing, so a misconfigured
 * environment can't lock everyone out.
 */
const ADMIN_EMAILS = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "ssoup1@protonmail.com"
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/login"); return; }
      const email = (user.email || "").toLowerCase();
      if (!ADMIN_EMAILS.includes(email)) { router.replace("/"); return; }
      setAllowed(true);
    });
  }, [router]);

  if (!allowed) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <p className="text-zinc-400">Verifying access...</p>
      </main>
    );
  }

  return <>{children}</>;
}
