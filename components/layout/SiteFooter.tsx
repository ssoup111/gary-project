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
            <Link href="/how-it-works" className="hover:text-[#9C2B44]">How It Works</Link>
            <Link href="/catalog" className="hover:text-[#9C2B44]">Catalog</Link>
            <Link href="/categories" className="hover:text-[#9C2B44]">Categories</Link>
            <Link href="/faq" className="hover:text-[#9C2B44]">FAQ</Link>
            <Link href="/contact" className="hover:text-[#9C2B44]">Contact</Link>
          </div>
        </div>

        <div>
          <p className="font-bold text-white">Account</p>
          <div className="mt-3 grid gap-2 text-sm text-white/70">
            <Link href="/login" className="hover:text-[#9C2B44]">Login</Link>
            <Link href="/signup" className="hover:text-[#9C2B44]">Create Account</Link>
            <Link href="/dashboard" className="hover:text-[#9C2B44]">Dashboard</Link>
            <Link href="/privacy" className="hover:text-[#9C2B44]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#9C2B44]">Terms</Link>
            <Link href="/content-rules" className="hover:text-[#9C2B44]">Content Rules</Link>
            <Link href="/contact" className="hover:text-[#9C2B44]">Contact</Link>
            <Link href="/faq" className="hover:text-[#9C2B44]">FAQ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
