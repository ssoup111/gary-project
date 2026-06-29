import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-20 text-white">
      <div className="mx-auto max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
          Friends Behind Bars
        </p>

        <h1 className="mt-4 text-4xl font-black">Customer Login</h1>

        <p className="mt-4 text-zinc-400">
          Sign in to browse images, place orders, and track deliveries.
        </p>

        <LoginForm />

        <p className="mt-6 text-sm text-zinc-400">
          New customer?{" "}
          <Link href="/signup" className="font-bold text-amber-300">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
