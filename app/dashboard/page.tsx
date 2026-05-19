import Link from "next/link";
import AuthGuard from "@/components/auth/AuthGuard";
import AccountNav from "@/components/auth/AccountNav";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <AccountNav />

          <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
            Friends Behind Bars
          </p>

          <h1 className="mt-4 text-5xl font-black">Customer Dashboard</h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Manage recipients, orders, subscriptions, favorites, and saved images.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/favorites" className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 hover:border-amber-400">
              <h2 className="text-xl font-black">Favorites</h2>
              <p className="mt-3 text-sm text-zinc-400">Saved images for later ordering.</p>
            </Link>

            <Link href="/catalog" className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 hover:border-amber-400">
              <h2 className="text-xl font-black">Browse Images</h2>
              <p className="mt-3 text-sm text-zinc-400">Choose approved images for delivery.</p>
            </Link>

            <Link href="/recipients" className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 hover:border-amber-400">
              <h2 className="text-xl font-black">Recipients</h2>
              <p className="mt-3 text-sm text-zinc-400">Save inmate profiles for repeat orders.</p>
            </Link>

            <Link href="/my-orders" className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 hover:border-amber-400">
              <h2 className="text-xl font-black">Orders</h2>
              <p className="mt-3 text-sm text-zinc-400">Track image purchases and delivery status.</p>
            </Link>

            <Link href="/subscriptions" className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 hover:border-amber-400">
              <h2 className="text-xl font-black">Subscriptions</h2>
              <p className="mt-3 text-sm text-zinc-400">Manage image plans and recurring deliveries.</p>
            </Link>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
