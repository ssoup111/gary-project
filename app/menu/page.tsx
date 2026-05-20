import Link from "next/link";

const links = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Catalog", href: "/catalog" },
  { label: "Categories", href: "/categories" },
  { label: "Subscriptions", href: "/subscriptions" },
  { label: "Facilities", href: "/facilities" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Login", href: "/login" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
];

export default function MenuPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
          Friends Behind Bars
        </p>

        <h1 className="mt-4 text-5xl font-black">Menu</h1>

        <div className="mt-10 grid gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-lg font-black hover:border-amber-400"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
