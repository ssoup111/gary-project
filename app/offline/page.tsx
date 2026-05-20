export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-20 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
          Friends Behind Bars
        </p>

        <h1 className="mt-4 text-4xl font-black">You are offline</h1>

        <p className="mt-4 leading-8 text-zinc-400">
          Check your connection and try again. Some pages may require internet access to load images, orders, recipients, and account information.
        </p>
      </div>
    </main>
  );
}
