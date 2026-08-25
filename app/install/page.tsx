export default function InstallPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-16 text-[#0A3161]">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#B31942]">
          Friends Behind Bars
        </p>

        <h1 className="mt-4 text-5xl font-black">Install the App</h1>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-black/10 bg-white p-6">
            <h2 className="text-2xl font-black">iPhone / Safari</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-[#0A3161]/78">
              <li>Open the site in Safari.</li>
              <li>Tap the Share button.</li>
              <li>Tap Add to Home Screen.</li>
              <li>Tap Add.</li>
            </ol>
          </section>

          <section className="rounded-3xl border border-black/10 bg-white p-6">
            <h2 className="text-2xl font-black">Android / Chrome</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-[#0A3161]/78">
              <li>Open the site in Chrome.</li>
              <li>Tap the menu button.</li>
              <li>Tap Add to Home screen or Install app.</li>
              <li>Confirm installation.</li>
            </ol>
          </section>
        </div>
      </div>
    </main>
  );
}
