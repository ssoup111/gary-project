import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0A3161] px-6 py-10 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
        <div>
          <p className="text-xl font-black text-white">Friends Behind Bars</p>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Approved digital image collections for customers sending safe, reviewed content to incarcerated recipients.
          </p>
        </div>

        <div>
          <p className="font-bold text-white">Browse</p>
          <div className="mt-3 grid gap-2 text-sm text-white/70">
            <Link href="/how-it-works" className="hover:text-[#B31942]">How It Works</Link>
            <Link href="/catalog" className="hover:text-[#B31942]">Catalog</Link>
            <Link href="/categories" className="hover:text-[#B31942]">Categories</Link>
            <Link href="/faq" className="hover:text-[#B31942]">FAQ</Link>
            <Link href="/contact" className="hover:text-[#B31942]">Contact</Link>
          </div>
        </div>

        <div>
          <p className="font-bold text-white">Account</p>
          <div className="mt-3 grid gap-2 text-sm text-white/70">
            <Link href="/login" className="hover:text-[#B31942]">Login</Link>
            <Link href="/signup" className="hover:text-[#B31942]">Create Account</Link>
            <Link href="/dashboard" className="hover:text-[#B31942]">Dashboard</Link>
            <Link href="/privacy" className="hover:text-[#B31942]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#B31942]">Terms</Link>
            <Link href="/content-rules" className="hover:text-[#B31942]">Content Rules</Link>
            <Link href="/contact" className="hover:text-[#B31942]">Contact</Link>
            <Link href="/faq" className="hover:text-[#B31942]">FAQ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
