import Link from "next/link";

export default function SiteNav() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <Link href="/" className="text-xl font-black tracking-tight text-amber-300">
          Friends Behind Bars
        </Link>

        <nav className="flex flex-wrap gap-3 text-sm font-bold">
          <Link href="/catalog" className="hover:text-amber-300">Catalog</Link>
          <Link href="/categories" className="hover:text-amber-300">Categories</Link>
          <Link href="/subscriptions" className="hover:text-amber-300">Subscriptions</Link>
          <Link href="/dashboard" className="hover:text-amber-300">Dashboard</Link>
          <Link href="/login" className="hover:text-amber-300">Login</Link>
        </nav>
      </div>
    </header>
  );
}
