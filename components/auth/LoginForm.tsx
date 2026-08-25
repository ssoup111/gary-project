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
        <label className="block text-sm font-bold text-[#0A3161]/85">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-xl border border-black/12 bg-white p-3 text-[#0A3161]"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-[#0A3161]/85">Password</label>
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-xs text-[#0A3161]/72 hover:text-[#9C2B44]"
          >
            Forgot password?
          </button>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-xl border border-black/12 bg-white p-3 text-[#0A3161]"
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>

      {resetSent && (
        <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-700">
          Password reset email sent — check your inbox.
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-xl bg-[#9C2B44] px-6 py-3 font-black text-white hover:bg-[#7A2036]"
      >
        Sign In
      </button>

      {status && <p className="text-sm font-bold text-[#9C2B44]">{status}</p>}
    </form>
  );
}
