import Link from "next/link";

export default function SiteNav() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-4 py-4 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link href="/" className="text-lg font-black tracking-tight text-amber-300 sm:text-xl">
          Friends Behind Bars
        </Link>

        <nav className="hidden flex-wrap gap-4 text-sm font-bold md:flex">
          <Link href="/about" className="hover:text-amber-300">About</Link>
          <Link href="/how-it-works" className="hover:text-amber-300">How It Works</Link>
          <Link href="/catalog" className="hover:text-amber-300">Catalog</Link>
          <Link href="/categories" className="hover:text-amber-300">Categories</Link>
          <Link href="/subscriptions" className="hover:text-amber-300">Subscriptions</Link>
          <Link href="/facilities" className="hover:text-amber-300">Facilities</Link>
          <Link href="/menu" className="hover:text-amber-300">Dashboard</Link>
          <Link href="/login" className="hover:text-amber-300">Login</Link>
        </nav>

        <Link
          href="/dashboard"
          className="rounded-xl bg-white px-4 py-2 text-sm font-black text-black md:hidden"
        >
          Menu
        </Link>
      </div>
    </header>
  );
}
