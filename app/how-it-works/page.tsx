export default function HowItWorksPage() {
  const steps = [
    {
      title: "1. Browse approved images",
      text: "Customers choose from reviewed catalog categories and approved image collections.",
    },
    {
      title: "2. Select a recipient",
      text: "Customers can save recipient information and reuse it for future orders.",
    },
    {
      title: "3. Place an order",
      text: "Selected images are attached to the recipient order and prepared for payment.",
    },
    {
      title: "4. Review and delivery queue",
      text: "Orders move through payment, review, and delivery preparation steps.",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
          Friends Behind Bars
        </p>

        <h1 className="mt-4 text-5xl font-black">How It Works</h1>

        <p className="mt-4 max-w-2xl leading-8 text-zinc-400">
          A simple process for selecting safe, approved digital images for incarcerated recipients.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {steps.map((step) => (
            <section key={step.title} className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-black">{step.title}</h2>
              <p className="mt-3 leading-7 text-zinc-400">{step.text}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
