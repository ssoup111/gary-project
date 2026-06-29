export const metadata = {
  title: "Content Rules",
  description: "Friends Behind Bars content standards — what images are allowed, what is prohibited, and how our review process works.",
};

import Link from "next/link";

const allowed = [
  "Animals and nature",
  "Cars, motorcycles, and vehicles",
  "Sports and athletics",
  "Music and entertainment",
  "Fantasy and anime illustrations",
  "Faith and inspirational imagery",
  "Food and landscapes",
  "Pin-up and artistic photography (18+ models only)",
  "Fitness and yoga",
  "Military and patriotic themes",
];

const prohibited = [
  "Any image depicting a person under 18 years of age",
  "Nudity or sexually explicit content",
  "Graphic violence, gore, or weapons imagery",
  "Drug paraphernalia or illegal activity",
  "Gang symbols, tattoo art glorifying criminal activity, or prison-prohibited imagery",
  "Content that demeans or threatens any individual or group",
  "Images depicting real identifiable people without appropriate rights",
  "Any content that violates applicable federal or state law",
];

export default function ContentRulesPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">Friends Behind Bars</p>
        <h1 className="mt-4 text-5xl font-black">Content Rules</h1>
        <p className="mt-4 max-w-2xl leading-8 text-zinc-400">
          Every image in our catalog has been manually reviewed and approved before it becomes available to customers. These rules exist to protect our customers, their recipients, and the integrity of the platform.
        </p>

        {/* Review process */}
        <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
          <h2 className="text-2xl font-black">Our Review Process</h2>
          <p className="mt-4 leading-7 text-zinc-400">
            All images — whether AI-generated or sourced from licensed stock libraries — go through a manual admin review before they appear in the catalog. Images that don't meet our standards are rejected and never shown to customers. Approved images are assigned to a category and made available for ordering.
          </p>
          <p className="mt-4 leading-7 text-zinc-400">
            We also follow the content guidelines set by Securus Technologies / JPay, the platform we use to deliver images to recipients. If an image passes our review but is rejected at the facility level, we will contact you.
          </p>
        </section>

        {/* Allowed */}
        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
          <h2 className="text-2xl font-black text-green-400">✓ Allowed Content</h2>
          <ul className="mt-4 space-y-2">
            {allowed.map((item) => (
              <li key={item} className="flex items-start gap-3 text-zinc-300">
                <span className="mt-1 text-green-400">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Prohibited */}
        <section className="mt-8 rounded-3xl border border-red-900/40 bg-red-950/20 p-8">
          <h2 className="text-2xl font-black text-red-400">✕ Prohibited Content</h2>
          <ul className="mt-4 space-y-2">
            {prohibited.map((item) => (
              <li key={item} className="flex items-start gap-3 text-zinc-300">
                <span className="mt-1 text-red-400">✕</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Minors callout */}
        <section className="mt-8 rounded-3xl border border-amber-400/30 bg-amber-400/10 p-6">
          <h2 className="text-lg font-black text-amber-300">Zero Tolerance: Minors</h2>
          <p className="mt-3 leading-7 text-zinc-300">
            Under no circumstances may any image depicting a person under 18 years of age appear in our catalog or be sent through our platform. This rule applies without exception. Accounts found attempting to circumvent this policy will be permanently banned and reported to the appropriate authorities.
          </p>
        </section>

        <p className="mt-8 text-sm text-zinc-500">
          Questions about our content standards?{" "}
          <Link href="/contact" className="text-amber-400 underline hover:text-amber-300">Contact us</Link>.
        </p>
      </div>
    </main>
  );
}
