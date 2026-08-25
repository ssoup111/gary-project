export const metadata = {
  title: "How It Works",
  description: "Learn how Friends Behind Bars delivers approved photos to incarcerated recipients through Securus. Simple 4-step process for $0.99 per image.",
};

import Link from "next/link";

const steps = [
  {
    n: "1",
    title: "Create a free account",
    text: "Sign up with your email address. Your account lets you save recipient profiles so you don't have to re-enter inmate info every time.",
    cta: { label: "Create Account", href: "/signup" },
  },
  {
    n: "2",
    title: "Browse the catalog",
    text: "Choose from 35 curated categories — animals, anime, classic cars, sports, pin-up, and more. Every image has been reviewed and approved before appearing in the catalog.",
    cta: { label: "Browse Catalog", href: "/catalog" },
  },
  {
    n: "3",
    title: "Enter your recipient's info",
    text: "Provide the inmate's full name, offender ID number, state, and facility. We support facilities on the Securus / JPay network. You can save recipient profiles for repeat orders.",
    cta: null,
  },
  {
    n: "4",
    title: "Pay $0.99 and we handle delivery",
    text: "Secure checkout via Stripe. Once payment is confirmed, your order enters our fulfillment queue and the image is delivered directly to your recipient's facility account — typically within 1–2 business days.",
    cta: null,
  },
];

const details = [
  {
    q: "Which facilities are supported?",
    a: "We currently support facilities on the Securus Technologies / JPay network. When placing an order, select your recipient's state and start typing the facility name — our typeahead search will show matching facilities.",
  },
  {
    q: "How is the image actually delivered?",
    a: "After your payment is confirmed, we log into the Securus Snap & Send system and send the image directly to your recipient's account on their facility tablet. They receive it like any other digital photo.",
  },
  {
    q: "How long does delivery take?",
    a: "Most orders are processed within 1–2 business days. You'll receive an email confirmation when payment is processed, and another when the image has been delivered.",
  },
  {
    q: "What if my order can't be delivered?",
    a: "If we're unable to deliver your image — for example, because the facility isn't on the Securus network or the inmate information doesn't match — we'll contact you at the email you used to sign up.",
  },
  {
    q: "Can I track my order?",
    a: "Yes. Visit the My Orders page after signing in to see your order status, payment confirmation, and delivery progress.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-white text-[#0A3161]">

      {/* Header */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#B31942]">Friends Behind Bars</p>
        <h1 className="mt-4 text-5xl font-black">How It Works</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[#0A3161]/78">
          Send an approved photo to an incarcerated loved one in four steps — no technical knowledge required.
        </p>
      </section>

      {/* Steps */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-2">
            {steps.map((step) => (
              <div key={step.n} className="rounded-3xl border border-black/10 bg-white p-8">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#B31942] text-xl font-black text-white">
                  {step.n}
                </span>
                <h2 className="mt-5 text-2xl font-black">{step.title}</h2>
                <p className="mt-3 leading-7 text-[#0A3161]/78">{step.text}</p>
                {step.cta && (
                  <Link href={step.cta.href} className="mt-5 inline-block rounded-xl bg-[#B31942] px-5 py-2 text-sm font-black text-white hover:bg-[#8f1434]">
                    {step.cta.label} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Delivery details */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-black">Delivery Details</h2>
        <div className="mt-8 grid gap-5">
          {details.map((item) => (
            <div key={item.q} className="rounded-2xl border border-black/10 bg-white p-6">
              <h3 className="text-lg font-black">{item.q}</h3>
              <p className="mt-3 leading-7 text-[#0A3161]/78">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black">Ready to send your first image?</h2>
          <p className="mt-3 text-[#0A3161]/78">Create a free account and get started in minutes.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="rounded-xl bg-[#B31942] px-8 py-3 font-black text-white hover:bg-[#8f1434]">Get Started Free</Link>
            <Link href="/catalog" className="rounded-xl border border-black/15 px-8 py-3 font-black text-[#0A3161] hover:border-[#B31942]">Browse Catalog</Link>
          </div>
        </div>
      </section>

    </main>
  );
}
