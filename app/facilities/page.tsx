export default function FacilitiesPage() {
  const states = [
    "Illinois",
    "Missouri",
    "Wisconsin",
    "Indiana",
    "Iowa",
  ];

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
          Friends Behind Bars
        </p>

        <h1 className="mt-4 text-5xl font-black">Facility Directory</h1>

        <p className="mt-4 max-w-2xl text-zinc-400">
          Facility rules and delivery requirements will be organized here as the platform grows.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {states.map((state) => (
            <div key={state} className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-black">{state}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Facilities and delivery rules for {state} will appear here.
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
