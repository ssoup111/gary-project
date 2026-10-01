import Link from "next/link";
import Image from "next/image";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0A3161] px-6 py-10 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] p-1">
              <Image src="/logo.png" alt="Friends Behind Bars" width={44} height={44} className="h-full w-full object-contain" />
            </span>
            <p className="text-xl font-black text-white">Friends Behind Bars</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Approved digital image collections for customers sending safe, reviewed content to incarcerated recipients.
          </p>
        </div>

        <div>
          <p className="font-bold text-white">Browse</p>
          <div className="mt-3 grid gap-2 text-sm text-white/70">
            <Link href="/how-it-works" className="hover:text-[#A6412B]">How It Works</Link>
            <Link href="/catalog" className="hover:text-[#A6412B]">Catalog</Link>
            <Link href="/categories" className="hover:text-[#A6412B]">Categories</Link>
            <Link href="/faq" className="hover:text-[#A6412B]">FAQ</Link>
            <Link href="/contact" className="hover:text-[#A6412B]">Contact</Link>
          </div>
        </div>

        <div>
          <p className="font-bold text-white">Account</p>
          <div className="mt-3 grid gap-2 text-sm text-white/70">
            <Link href="/login" className="hover:text-[#A6412B]">Login</Link>
            <Link href="/signup" className="hover:text-[#A6412B]">Create Account</Link>
            <Link href="/dashboard" className="hover:text-[#A6412B]">Dashboard</Link>
            <Link href="/privacy" className="hover:text-[#A6412B]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#A6412B]">Terms</Link>
            <Link href="/content-rules" className="hover:text-[#A6412B]">Content Rules</Link>
            <Link href="/contact" className="hover:text-[#A6412B]">Contact</Link>
            <Link href="/faq" className="hover:text-[#A6412B]">FAQ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
