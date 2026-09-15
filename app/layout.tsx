import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SiteNav from "@/components/layout/SiteNav";
import SiteFooter from "@/components/layout/SiteFooter";
import { CartProvider } from "@/lib/cart";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"], weight: ["400", "600", "700", "900"] });

export const metadata: Metadata = {
  title: { default: "Friends Behind Bars", template: "%s — Friends Behind Bars" },
  description: "Send approved photos to incarcerated loved ones for $0.99. Browse 35 curated image categories, enter your recipient's info, and we handle the delivery.",
  openGraph: {
    siteName: "Friends Behind Bars",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CartProvider>
          <SiteNav />
          {children}
          <SiteFooter />
        </CartProvider>
        {/* Visitor counts and page views. No cookies, no per-person tracking. */}
        <Analytics />
      </body>
    </html>
  );
}