export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  const sections = [
    { title: "Acceptance of Terms", body: "By using Friends Behind Bars, you agree to these terms. If you do not agree, please do not use our platform." },
    { title: "Eligibility", body: "You must be 18 or older to use this platform. All image content is intended for adult audiences only." },
    { title: "Content Standards", body: "All images are reviewed before approval. We strictly prohibit images containing minors, explicit content, or material that violates facility rules." },
    { title: "Orders and Payments", body: "All sales are final. Refunds may be issued at our discretion in cases of technical error or failed delivery." },
    { title: "Account Responsibility", body: "You are responsible for maintaining the security of your account and all activity that occurs under it." },
    { title: "Termination", body: "We reserve the right to terminate accounts that violate our content standards or terms of service." },
    { title: "Contact", body: "Questions about these terms? Contact us through our contact page." },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">Friends Behind Bars</p>
        <h1 className="mt-4 text-5xl font-black">Terms of Service</h1>
        <p className="mt-4 text-zinc-400">Last updated: May 2026</p>
        <div className="mt-10 grid gap-6">
          {sections.map((s) => (
            <section key={s.title} className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-xl font-black">{s.title}</h2>
              <p className="mt-3 leading-7 text-zinc-300">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
