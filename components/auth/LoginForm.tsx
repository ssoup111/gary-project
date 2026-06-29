"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Signing in...");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus(error.message);
      return;
    }

    router.push("/dashboard");
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setStatus("Enter your email above, then click Forgot password.");
      return;
    }
    setStatus("Sending reset email...");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { setStatus(error.message); return; }
    setResetSent(true);
    setStatus("");
  }

  return (
    <form onSubmit={handleLogin} className="mt-8 space-y-5">
      <div>
        <label className="block text-sm font-bold text-zinc-300">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-zinc-300">Password</label>
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-xs text-zinc-500 hover:text-amber-300"
          >
            Forgot password?
          </button>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white"
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>

      {resetSent && (
        <p className="rounded-xl border border-green-700 bg-green-950 p-3 text-sm font-bold text-green-300">
          Password reset email sent — check your inbox.
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-xl bg-white px-6 py-3 font-black text-black hover:bg-amber-300"
      >
        Sign In
      </button>

      {status && <p className="text-sm font-bold text-amber-300">{status}</p>}
    </form>
  );
}
