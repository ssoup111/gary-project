"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [ready, setReady] = useState(false);

  // Supabase puts the recovery token in the URL hash fragment.
  // onAuthStateChange fires with event "PASSWORD_RECOVERY" once it's exchanged.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setStatus("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setStatus("Passwords do not match."); return; }
    setStatus("Updating password...");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setStatus(error.message); return; }
    setStatus("Password updated! Redirecting to login...");
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <main className="min-h-screen bg-[#FAF8F5] px-6 py-20 text-[#0A3161]">
      <div className="mx-auto max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#A6412B]">Friends Behind Bars</p>
        <h1 className="mt-4 text-4xl font-black">Reset Password</h1>

        {!ready ? (
          <p className="mt-6 text-[#0A3161]/78">Verifying your reset link… if nothing happens, try clicking the link in your email again.</p>
        ) : (
          <form onSubmit={handleReset} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-bold text-[#0A3161]/85">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="mt-2 w-full rounded-xl border border-black/12 bg-white p-3 text-[#0A3161]"
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#0A3161]/85">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter new password"
                className="mt-2 w-full rounded-xl border border-black/12 bg-white p-3 text-[#0A3161]"
                autoComplete="new-password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-[#A6412B] px-6 py-3 font-black text-white hover:bg-[#8C3520]"
            >
              Set New Password
            </button>
            {status && <p className="text-sm font-bold text-[#A6412B]">{status}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
