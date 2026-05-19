"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Facility = {
  id: string;
  name: string;
  state: string;
  facility_type: string | null;
  delivery_notes: string | null;
};

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [status, setStatus] = useState("Loading facilities...");

  async function loadFacilities() {
    const { data, error } = await supabase
      .from("facilities")
      .select("id,name,state,facility_type,delivery_notes")
      .eq("is_active", true)
      .order("state")
      .order("name");

    if (error) {
      setStatus(error.message);
      return;
    }

    setFacilities(data || []);
    setStatus("");
  }

  useEffect(() => {
    loadFacilities();
  }, []);

  const states = Array.from(new Set(facilities.map((facility) => facility.state))).sort();

  const filteredFacilities = useMemo(() => {
    return facilities.filter((facility) => {
      const matchesSearch =
        facility.name.toLowerCase().includes(search.toLowerCase()) ||
        facility.state.toLowerCase().includes(search.toLowerCase()) ||
        (facility.facility_type || "").toLowerCase().includes(search.toLowerCase());

      const matchesState = selectedState ? facility.state === selectedState : true;

      return matchesSearch && matchesState;
    });
  }, [facilities, search, selectedState]);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
          Friends Behind Bars
        </p>

        <h1 className="mt-4 text-5xl font-black">Facility Directory</h1>

        <p className="mt-4 max-w-2xl text-zinc-400">
          Search facilities and organize delivery notes as the platform grows.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-[1fr_240px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-white"
            placeholder="Search facility, state, or type"
          />

          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-white"
          >
            <option value="">All states</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        {status ? (
          <p className="mt-8 font-bold text-amber-300">{status}</p>
        ) : filteredFacilities.length === 0 ? (
          <p className="mt-8 text-zinc-400">No matching facilities.</p>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFacilities.map((facility) => (
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
