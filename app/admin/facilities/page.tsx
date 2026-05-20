import AdminNav from "@/components/admin/AdminNav";
import { supabase } from "@/lib/supabaseClient";

type Facility = {
  id: string;
  name: string;
  state: string;
  facility_type: string | null;
  delivery_notes: string | null;
  is_active: boolean | null;
};

export default async function AdminFacilitiesPage() {
  const { data: facilities, error } = await supabase
    .from("facilities")
    .select("id,name,state,facility_type,delivery_notes,is_active")
    .order("state")
    .order("name");

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <AdminNav />

        <h1 className="text-5xl font-black">Admin Facilities</h1>

        {error ? (
          <p className="mt-8 text-red-300">{error.message}</p>
        ) : !facilities || facilities.length === 0 ? (
          <p className="mt-8 text-zinc-400">No facilities yet.</p>
        ) : (
          <div className="mt-10 grid gap-4">
            {facilities.map((facility: Facility) => (
              <div key={facility.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex flex-wrap justify-between gap-4">
                  <div>
                    <p className="text-xl font-black">{facility.name}</p>
                    <p className="mt-2 text-sm text-zinc-400">{facility.state}</p>
                    <p className="text-sm text-zinc-400">{facility.facility_type || "Facility"}</p>
                    {facility.delivery_notes && (
                      <p className="mt-3 text-sm leading-6 text-zinc-300">{facility.delivery_notes}</p>
                    )}
                  </div>

                  <p className={facility.is_active ? "text-green-300" : "text-red-300"}>
                    {facility.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
