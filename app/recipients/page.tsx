import Link from "next/link";

export default function RecipientsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
          Friends Behind Bars
        </p>

        <h1 className="mt-4 text-5xl font-black">Saved Recipients</h1>

        <p className="mt-4 max-w-2xl text-zinc-400">
          Save recipient information once, then use it for future image orders and subscriptions.
        </p>

        <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
          <h2 className="text-2xl font-black">Add Recipient</h2>

          <form className="mt-6 grid gap-5">
            <input className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white" placeholder="Recipient full name" />
            <input className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white" placeholder="Inmate / DOC number" />
            <input className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white" placeholder="Facility name" />
            <input className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white" placeholder="State" />
            <textarea className="min-h-28 rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white" placeholder="Mailing rules or notes" />

            <button type="button" className="rounded-xl bg-white px-6 py-3 font-black text-black">
              Save Recipient
            </button>
          </form>
        </section>

        <div className="mt-8">
          <Link href="/dashboard" className="font-bold text-amber-300">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
