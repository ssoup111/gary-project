import { supabase } from "@/lib/supabaseClient";

type Facility = {
  id: string;
  name: string;
  state: string;
  facility_type: string | null;
  delivery_notes: string | null;
};

export default async function FacilitiesPage() {
  const { data: facilities, error } = await supabase
    .from("facilities")
    .select("id,name,state,facility_type,delivery_notes")
    .eq("is_active", true)
    .order("state")
    .order("name");

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

        {error && (
          <div className="mt-8 rounded-2xl border border-red-900 bg-red-950 p-5 text-red-200">
            {error.message}
          </div>
        )}

        {!facilities || facilities.length === 0 ? (
          <p className="mt-8 text-zinc-400">No facilities added yet.</p>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {facilities.map((facility: Facility) => (
              <div key={facility.id} className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300">
                  {facility.state}
                </p>

                <h2 className="mt-3 text-2xl font-black">{facility.name}</h2>

                <p className="mt-2 text-sm text-zinc-400">
                  {facility.facility_type || "Facility"}
                </p>

                {facility.delivery_notes && (
                  <p className="mt-4 text-sm leading-6 text-zinc-300">
                    {facility.delivery_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
