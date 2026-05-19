import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-20 text-white">
      <div className="mx-auto max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
          Friends Behind Bars
        </p>

        <h1 className="mt-4 text-4xl font-black">Customer Login</h1>

        <p className="mt-4 text-zinc-400">
          Sign in to manage image orders, saved recipients, and subscriptions.
        </p>

        <form className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-bold text-zinc-300">
              Email
            </label>
            <input
              type="email"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-300">
              Password
            </label>
            <input
              type="password"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="button"
            className="w-full rounded-xl bg-white px-6 py-3 font-black text-black"
          >
            Sign In
          </button>
        </form>

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
