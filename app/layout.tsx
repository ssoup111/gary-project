import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import SiteNav from "@/components/layout/SiteNav";
import SiteFooter from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "Friends Behind Bars",
  description: "AI-generated image collections reviewed and approved before release.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-zinc-800 bg-zinc-950 text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
            <Link href="/" className="text-2xl font-black tracking-tight">
              Friends Behind Bars
            </Link>

            <nav className="flex flex-wrap gap-5 text-sm font-semibold text-zinc-300">
              <Link href="/">Home</Link>
              <Link href="/categories">Categories</Link>
              <Link href="/catalog">Catalog</Link>
              <Link href="/admin">Admin Review</Link>
              <Link href="/orders">Orders</Link>
              <Link href="/order">Create Order</Link>
              <Link href="/subscriptions">Subscriptions</Link>
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
