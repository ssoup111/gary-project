"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const steps = [
  {
    n: "1",
    title: "Create a free account",
    text: "Sign up with your email address. Your account lets you save recipient profiles so you don't have to re-enter inmate info every time.",
    cta: { label: "Create Account", href: "/signup" },
    loggedInCta: { label: "View My Orders", href: "/my-orders" },
  },
  {
    n: "2",
    title: "Browse the catalog",
    text: "Choose from 35 curated categories — animals, anime, classic cars, sports, pin-up, and more. Every image has been reviewed and approved before appearing in the catalog.",
    cta: { label: "Browse Catalog", href: "/catalog" },
    loggedInCta: { label: "Browse Catalog", href: "/catalog" },
  },
  {
    n: "3",
    title: "Enter your recipient's info",
    text: "Provide the inmate's full name, offender ID number, state, and facility. We support facilities on the Securus / JPay network. You can save recipient profiles for repeat orders.",
    cta: null,
    loggedInCta: null,
  },
  {
    n: "4",
    title: "Pay $0.99 and we handle delivery",
    text: "Secure checkout via Stripe. Once payment is confirmed, your order enters our fulfillment queue and the image is delivered directly to your recipient's facility account — typically within 1–2 business days.",
    cta: null,
    loggedInCta: null,
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
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session?.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-[#FAF8F5] text-[#0A3161]">

      {/* Header */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#A6412B]">Friends Behind Bars</p>
        <h1 className="mt-3 text-4xl font-black">How It Works</h1>
        <p className="mt-3 max-w-2xl text-lg leading-7 text-[#0A3161]/78">
          Send an approved photo to an incarcerated loved one in four steps — no technical knowledge required.
        </p>
      </section>

      {/* Steps — horizontal timeline on desktop, stacked on mobile */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="relative grid gap-10 md:grid-cols-4 md:gap-6">
            {/* connecting line — desktop only */}
            <div className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-black/10 md:block" />

            {steps.map((step) => {
              const cta = loggedIn ? step.loggedInCta : step.cta;
              return (
                <div key={step.n} className="relative flex gap-4 md:flex-col md:gap-0">
                  <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#A6412B] text-xl font-black text-white ring-4 ring-white">
                    {step.n}
                  </span>
                  <div className="md:mt-5">
                    <h2 className="text-xl font-black">{step.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#0A3161]/78">{step.text}</p>
                    {cta && (
                      <Link href={cta.href} className="mt-4 inline-block rounded-xl bg-[#A6412B] px-4 py-2 text-xs font-black text-white hover:bg-[#8C3520]">
                        {cta.label} →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
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
          {loggedIn ? (
            <>
              <h2 className="text-3xl font-black">Ready to send your next image?</h2>
              <p className="mt-3 text-[#0A3161]/78">Browse the catalog or check your order history.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link href="/catalog" className="rounded-xl bg-[#A6412B] px-8 py-3 font-black text-white hover:bg-[#8C3520]">Browse Catalog</Link>
                <Link href="/my-orders" className="rounded-xl border border-black/15 px-8 py-3 font-black text-[#0A3161] hover:border-[#A6412B]">My Orders</Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-black">Ready to send your first image?</h2>
              <p className="mt-3 text-[#0A3161]/78">Create a free account and get started in minutes.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link href="/signup" className="rounded-xl bg-[#A6412B] px-8 py-3 font-black text-white hover:bg-[#8C3520]">Get Started Free</Link>
                <Link href="/catalog" className="rounded-xl border border-black/15 px-8 py-3 font-black text-[#0A3161] hover:border-[#A6412B]">Browse Catalog</Link>
              </div>
            </>
          )}
        </div>
      </section>

    </main>
  );
}
