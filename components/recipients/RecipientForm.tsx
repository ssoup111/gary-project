"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RecipientForm() {
  const [fullName, setFullName] = useState("");
  const [inmateNumber, setInmateNumber] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [state, setState] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");

  async function saveRecipient() {
    setStatus("Saving recipient...");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setStatus("Please sign in before saving recipients.");
      return;
    }

    const { error } = await supabase.from("inmate_contacts").insert({
      user_id: userData.user.id,
      full_name: fullName,
      inmate_number: inmateNumber,
      facility_name: facilityName,
      state,
      notes,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setFullName("");
    setInmateNumber("");
    setFacilityName("");
    setState("");
    setNotes("");
    setStatus("Recipient saved.");
  }

  return (
    <form className="mt-6 grid gap-5">
      <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white" placeholder="Recipient full name" />
      <input value={inmateNumber} onChange={(e) => setInmateNumber(e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white" placeholder="Inmate / DOC number" />
      <input value={facilityName} onChange={(e) => setFacilityName(e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white" placeholder="Facility name" />
      <input value={state} onChange={(e) => setState(e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white" placeholder="State" />
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-28 rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white" placeholder="Mailing rules or notes" />

      <button type="button" onClick={saveRecipient} className="rounded-xl bg-white px-6 py-3 font-black text-black">
        Save Recipient
      </button>

      {status && <p className="font-bold text-amber-300">{status}</p>}
    </form>
  );
}
