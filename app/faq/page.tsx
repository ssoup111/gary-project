export const metadata = {
  title: "FAQ",
  description: "Frequently asked questions about Friends Behind Bars — pricing, delivery, supported facilities, image rules, and more.",
};

import Link from "next/link";

const faqs = [
  {
    q: "How much does it cost?",
    a: "$1.99 per image. No subscription required, no hidden fees. Stripe processes payment securely.",
  },
  {
    q: "Which facilities are supported?",
    a: "We support facilities on the Securus Technologies / JPay network. When entering your recipient's info, select their state and search by facility name to confirm they're on our supported list.",
  },
  {
    q: "How long does delivery take?",
    a: "Most orders are delivered within 1–2 business days after payment. You'll get an email when payment is confirmed and another when the image is delivered.",
  },
  {
    q: "How does the image actually get to my recipient?",
    a: "After payment, we send the image through the Securus Snap & Send system directly to your recipient's account on their facility tablet. They receive it the same way they'd receive any digital photo on the Securus platform.",
  },
  {
    q: "Do I need an account to order?",
    a: "Yes — you need a free account so we can track your orders and send you delivery confirmation. Sign-up is quick and only requires an email address.",
  },
  {
    q: "Can I save a recipient for future orders?",
    a: "Yes. When you enter an inmate's info manually, we automatically save them to your Saved Recipients so future orders are faster.",
  },
  {
    q: "Can I send any image I want?",
    a: "No — only images from our approved catalog can be sent. Every image has been reviewed before appearing in the catalog. You can't upload your own photos at this time.",
  },
  {
    q: "Are there content restrictions?",
    a: "Yes. No minors or anyone under 18 may appear in any image. All images must comply with our content rules and facility guidelines. See our Content Rules page for the full list.",
  },
  {
    q: "What if my order can't be delivered?",
    a: "If delivery fails — for example because the facility isn't on the Securus network or the recipient info doesn't match — we'll reach out to you by email to resolve it.",
  },
  {
    q: "Can I track my order status?",
    a: "Yes. Sign in and visit My Orders to see your order's payment status and delivery progress.",
  },
  {
    q: "What payment methods are accepted?",
    a: "All major credit and debit cards via Stripe. We don't store your card details — Stripe handles everything.",
  },
  {
    q: "Is this affiliated with Securus or JPay?",
    a: "No. Friends Behind Bars is an independent service. We use the Securus Snap & Send system to deliver images on your behalf, but we are not affiliated with, endorsed by, or connected to Securus Technologies or JPay.",
  },
];

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">Friends Behind Bars</p>
        <h1 className="mt-4 text-5xl font-black">Frequently Asked Questions</h1>
        <p className="mt-4 text-zinc-400">
          Can't find your answer?{" "}
          <Link href="/contact" className="text-amber-400 underline hover:text-amber-300">Contact us</Link>.
        </p>

        <div className="mt-10 grid gap-4">
          {faqs.map((faq) => (
            <section key={faq.q} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-lg font-black">{faq.q}</h2>
              <p className="mt-3 leading-7 text-zinc-400">{faq.a}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-amber-400/30 bg-amber-400/10 p-8 text-center">
          <h2 className="text-2xl font-black">Ready to get started?</h2>
          <p className="mt-2 text-zinc-400">Browse the catalog and send your first image for $1.99.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="rounded-xl bg-white px-6 py-3 font-black text-black hover:bg-amber-300">Create Account</Link>
            <Link href="/catalog" className="rounded-xl border border-zinc-600 px-6 py-3 font-black text-white hover:border-amber-400">Browse Catalog</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
