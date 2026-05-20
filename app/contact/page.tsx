import ContactForm from "@/components/contact/ContactForm";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
          Friends Behind Bars
        </p>

        <h1 className="mt-4 text-5xl font-black">Contact Us</h1>

        <p className="mt-4 leading-8 text-zinc-400">
          Send a message about orders, facilities, content rules, or account questions.
        </p>

        <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
          <ContactForm />
        </section>
      </div>
    </main>
  );
}
