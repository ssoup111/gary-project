export default function FAQPage() {
  const faqs = [
    {
      question: "What is Friends Behind Bars?",
      answer:
        "Friends Behind Bars provides approved digital image collections that customers can select for incarcerated recipients.",
    },
    {
      question: "Are images reviewed before release?",
      answer:
        "Yes. Images are reviewed before being made available or delivered.",
    },
    {
      question: "Are children allowed in images?",
      answer:
        "No. Children and minors are not allowed in generated image categories or customer-facing image content.",
    },
    {
      question: "Can I save recipient information?",
      answer:
        "Yes. Customers can create saved recipient profiles for repeat orders.",
    },
    {
      question: "Can I order a single image?",
      answer:
        "Yes. The current workflow supports single-image selection and checkout.",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
          Friends Behind Bars
        </p>

        <h1 className="mt-4 text-5xl font-black">FAQ</h1>

        <div className="mt-10 grid gap-5">
          {faqs.map((faq) => (
            <section
              key={faq.question}
              className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <h2 className="text-xl font-black">{faq.question}</h2>
              <p className="mt-3 leading-7 text-zinc-400">{faq.answer}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
