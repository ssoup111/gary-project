"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  async function handleLogin() {
    setStatus("Signing in...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <form className="mt-8 space-y-5">
      <div>
        <label className="block text-sm font-bold text-zinc-300">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-zinc-300">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white"
          placeholder="••••••••"
        />
      </div>

      <button
        type="button"
        onClick={handleLogin}
        className="w-full rounded-xl bg-white px-6 py-3 font-black text-black"
      >
        Sign In
      </button>

      {status && <p className="text-sm font-bold text-amber-300">{status}</p>}
    </form>
  );
}
