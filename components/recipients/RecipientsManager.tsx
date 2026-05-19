"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Recipient = {
  id: string;
  full_name: string;
  inmate_number: string | null;
  facility_name: string | null;
  state: string | null;
  notes: string | null;
};

export default function RecipientsManager() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [fullName, setFullName] = useState("");
  const [inmateNumber, setInmateNumber] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [state, setState] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");

  async function loadRecipients() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setStatus("Sign in to manage saved recipients.");
      return;
    }

    const { data, error } = await supabase
      .from("inmate_contacts")
      .select("id,full_name,inmate_number,facility_name,state,notes")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(error.message);
      return;
    }

    setRecipients(data || []);
  }

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
    await loadRecipients();
  }


  async function deleteRecipient(recipientId: string) {
    setStatus("Deleting recipient...");

    const { error } = await supabase
      .from("inmate_contacts")
      .delete()
      .eq("id", recipientId);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Recipient deleted.");
    await loadRecipients();
  }

  useEffect(() => {
    loadRecipients();
  }, []);

  return (
    <>
      <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
        <h2 className="text-2xl font-black">Add Recipient</h2>

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
      </section>

      <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
        <h2 className="text-2xl font-black">Your Saved Recipients</h2>

        {recipients.length === 0 ? (
          <p className="mt-5 text-zinc-400">No saved recipients yet.</p>
        ) : (
          <div className="mt-6 grid gap-4">
            {recipients.map((recipient) => (
              <div key={recipient.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                <h3 className="text-xl font-black">{recipient.full_name}</h3>
                <p className="mt-2 text-sm text-zinc-400">DOC/Inmate #: {recipient.inmate_number || "Not provided"}</p>
                <p className="text-sm text-zinc-400">Facility: {recipient.facility_name || "Not provided"}</p>
                <p className="text-sm text-zinc-400">State: {recipient.state || "Not provided"}</p>
                {recipient.notes && <p className="mt-3 text-sm leading-6 text-zinc-300">{recipient.notes}</p>}

                <button
                  type="button"
                  onClick={() => deleteRecipient(recipient.id)}
                  className="mt-4 rounded-xl border border-red-800 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-950"
                >
                  Delete Recipient
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
