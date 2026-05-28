"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");

  async function handleSignup() {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setStatus("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setStatus("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("Passwords do not match. Please re-enter them.");
      return;
    }
    setStatus("Creating account...");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { setStatus(error.message); return; }
    setStatus("Account created! Check your email to confirm, then sign in.");
    setTimeout(() => router.push("/login"), 3000);
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-20 text-white">
      <div className="mx-auto max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">Friends Behind Bars</p>
        <h1 className="mt-4 text-4xl font-black">Create Account</h1>
        <p className="mt-4 text-zinc-400">Sign up to browse approved images and send them to incarcerated recipients.</p>

        <div className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-bold text-zinc-300">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white placeholder:text-zinc-600"
              placeholder="you@example.com" />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-bold text-zinc-300">Password</label>
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="text-xs font-bold text-amber-300">
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white placeholder:text-zinc-600"
              placeholder="At least 6 characters" />
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-300">Confirm Password</label>
            <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white placeholder:text-zinc-600"
              placeholder="Re-enter your password" />
          </div>

          <button type="button" onClick={handleSignup}
            className="w-full rounded-xl bg-white px-6 py-3 font-black text-black">
            Create Account
          </button>
          {status && <p className="text-sm font-bold text-amber-300">{status}</p>}
        </div>

        <p className="mt-6 text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-amber-300">Sign in</Link>
        </p>
      </div>
    </main>
  );
}