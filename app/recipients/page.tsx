"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type Recipient = {
  id: string;
  full_name: string;
  inmate_number: string | null;
  facility_name: string | null;
  state: string | null;
  notes: string | null;
};

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [fullName, setFullName] = useState("");
  const [inmateNumber, setInmateNumber] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [state, setState] = useState("");
  const [notes, setNotes] = useState("");

  async function loadRecipients() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setLoading(false); return; }
    const { data } = await supabase
      .from("inmate_contacts")
      .select("id,full_name,inmate_number,facility_name,state,notes")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });
    setRecipients(data || []);
    setLoading(false);
  }

  useEffect(() => { loadRecipients(); }, []);

  async function saveRecipient() {
    if (!fullName.trim() || !inmateNumber.trim()) {
      setStatus("Full name and inmate number are required.");
      return;
    }
    const duplicate = recipients.find((r) => r.inmate_number?.trim().toLowerCase() === inmateNumber.trim().toLowerCase());
    if (duplicate) {
      setStatus("A recipient with inmate number " + inmateNumber + " already exists: " + duplicate.full_name);
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("inmate_contacts").insert({
      user_id: userData.user?.id || null,
      full_name: fullName.trim(),
      inmate_number: inmateNumber.trim(),
      facility_name: facilityName.trim() || null,
      state: state.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) { setStatus("Failed to save: " + error.message); return; }
    setStatus("Recipient saved!");
    setFullName(""); setInmateNumber(""); setFacilityName(""); setState(""); setNotes("");
    await loadRecipients();
  }

  async function deleteRecipient(id: string) {
    if (!confirm("Delete this recipient?")) return;
    await supabase.from("inmate_contacts").delete().eq("id", id);
    setStatus("Recipient deleted.");
    await loadRecipients();
  }

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-[#0A3161]">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#B31942]">Friends Behind Bars</p>
        <h1 className="mt-4 text-5xl font-black">Saved Recipients</h1>
        <p className="mt-4 max-w-2xl text-[#0A3161]/60">Save recipient information once, then reuse it for future image orders.</p>

        <section className="mt-10 rounded-3xl border border-black/10 bg-white p-8">
          <h2 className="text-2xl font-black">Add Recipient</h2>
          <div className="mt-6 grid gap-5">
            <div>
              <label className="block text-sm font-bold text-[#0A3161]/70">Full Name <span className="text-[#B31942]">*</span></label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. John Smith" className="mt-2 w-full rounded-xl border border-black/12 bg-white p-3 text-[#0A3161] placeholder:text-[#0A3161]/45" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#0A3161]/70">Inmate / DOC Number <span className="text-[#B31942]">*</span></label>
              <input value={inmateNumber} onChange={(e) => setInmateNumber(e.target.value)} placeholder="e.g. 123456" className="mt-2 w-full rounded-xl border border-black/12 bg-white p-3 text-[#0A3161] placeholder:text-[#0A3161]/45" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#0A3161]/70">Facility Name</label>
              <input value={facilityName} onChange={(e) => setFacilityName(e.target.value)} placeholder="e.g. Stateville Correctional Center" className="mt-2 w-full rounded-xl border border-black/12 bg-white p-3 text-[#0A3161] placeholder:text-[#0A3161]/45" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#0A3161]/70">State</label>
              <input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Illinois" className="mt-2 w-full rounded-xl border border-black/12 bg-white p-3 text-[#0A3161] placeholder:text-[#0A3161]/45" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#0A3161]/70">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Mailing rules or delivery notes" className="mt-2 min-h-24 w-full rounded-xl border border-black/12 bg-white p-3 text-[#0A3161] placeholder:text-[#0A3161]/45" />
            </div>
            <button type="button" onClick={saveRecipient} disabled={saving} className="rounded-xl bg-[#B31942] px-6 py-3 font-black text-white disabled:opacity-60">
              {saving ? "Saving..." : "Save Recipient"}
            </button>
            {status && <p className={"text-sm font-bold " + (status.startsWith("Recipient saved") ? "text-green-700" : "text-[#B31942]")}>{status}</p>}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-black">Your Recipients</h2>
          {loading ? (
            <LoadingSpinner message="Loading recipients..." />
          ) : recipients.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-black/10 bg-white p-8">
              <p className="text-[#0A3161]/60">No recipients saved yet. Add one above.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5">
              {recipients.map((recipient) => (
                <div key={recipient.id} className="rounded-3xl border border-black/10 bg-white p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xl font-black">{recipient.full_name}</p>
                      <p className="mt-2 text-[#0A3161]/60">Inmate #: {recipient.inmate_number || "Not provided"}</p>
                      <p className="text-[#0A3161]/60">Facility: {recipient.facility_name || "Not provided"}</p>
                      <p className="text-[#0A3161]/60">State: {recipient.state || "Not provided"}</p>
                      {recipient.notes && <p className="mt-3 text-sm text-[#0A3161]/50">{recipient.notes}</p>}
                    </div>
                    <button onClick={() => deleteRecipient(recipient.id)} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:border-red-500">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
