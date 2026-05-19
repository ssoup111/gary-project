import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
        <div>
          <p className="text-xl font-black text-amber-300">Friends Behind Bars</p>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Approved digital image collections for customers sending safe, reviewed content to incarcerated recipients.
          </p>
        </div>

        <div>
          <p className="font-bold">Browse</p>
          <div className="mt-3 grid gap-2 text-sm text-zinc-400">
            <Link href="/catalog" className="hover:text-amber-300">Catalog</Link>
            <Link href="/categories" className="hover:text-amber-300">Categories</Link>
            <Link href="/subscriptions" className="hover:text-amber-300">Subscriptions</Link>
          </div>
        </div>

        <div>
          <p className="font-bold">Account</p>
          <div className="mt-3 grid gap-2 text-sm text-zinc-400">
            <Link href="/login" className="hover:text-amber-300">Login</Link>
            <Link href="/signup" className="hover:text-amber-300">Create Account</Link>
            <Link href="/dashboard" className="hover:text-amber-300">Dashboard</Link>
            <Link href="/privacy" className="hover:text-amber-300">Privacy</Link>
            <Link href="/terms" className="hover:text-amber-300">Terms</Link>
            <Link href="/content-rules" className="hover:text-amber-300">Content Rules</Link>
            <Link href="/contact" className="hover:text-amber-300">Contact</Link>
            <Link href="/faq" className="hover:text-amber-300">FAQ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
