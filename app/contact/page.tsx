export default function ContactPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
          Friends Behind Bars
        </p>

        <h1 className="mt-4 text-5xl font-black">Contact Us</h1>

        <p className="mt-4 leading-8 text-zinc-400">
          Contact form functionality will be added before public launch.
        </p>

        <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
          <div className="grid gap-5">
            <input className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white" placeholder="Your name" />
            <input className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white" placeholder="Email address" />
            <textarea className="min-h-40 rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white" placeholder="Message" />

            <button type="button" className="rounded-xl bg-white px-6 py-3 font-black text-black">
              Send Message
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
