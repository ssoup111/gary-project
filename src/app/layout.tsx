import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gary's Picture Project",
  description: "Preserving memories through photos and stories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif" }}>
        <header
          style={{
            borderBottom: "1px solid #ddd",
            background: "#ffffff",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <nav
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "18px 30px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/"
              style={{
                fontSize: "22px",
                fontWeight: "bold",
                color: "#111",
                textDecoration: "none",
              }}
            >
              Gary&apos;s Picture Project
            </Link>

            <div
              style={{
                display: "flex",
                gap: "18px",
                flexWrap: "wrap",
                fontSize: "16px",
              }}
            >
              <Link href="/" style={{ color: "#111", textDecoration: "none" }}>
                Home
              </Link>

              <Link
                href="/upload"
                style={{ color: "#111", textDecoration: "none" }}
              >
                Upload
              </Link>

              <Link
                href="/gallery"
                style={{ color: "#111", textDecoration: "none" }}
              >
                Gallery
              </Link>

              <Link
                href="/contact"
                style={{ color: "#111", textDecoration: "none" }}
              >
                Contact
              </Link>
            </div>
          </nav>
        </header>

        {children}
      </body>
    </html>
  );
}