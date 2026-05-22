import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import SiteNav from "@/components/layout/SiteNav";
import SiteFooter from "@/components/layout/SiteFooter";

const inter = Inter({ subsets: ["latin"], weight: ["400", "600", "700", "900"] });

export const metadata: Metadata = {
  title: "Friends Behind Bars",
  description: "AI-generated image collections reviewed and approved before release.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="border-b border-zinc-800 bg-zinc-950 text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
            <Link href="/" className="text-2xl font-black tracking-tight">
              Friends Behind Bars
            </Link>
            <nav className="flex flex-wrap gap-5 text-sm font-semibold text-zinc-300">
              <Link href="/catalog">Catalog</Link>
              <Link href="/order">Create Order</Link>
              <Link href="/my-orders">My Orders</Link>
              <Link href="/subscriptions">Subscriptions</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/login">Login</Link>
            </nav>
          </div>
        </header>
        <SiteNav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}