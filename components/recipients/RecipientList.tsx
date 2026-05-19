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

export default function RecipientList() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [status, setStatus] = useState("Loading recipients...");

  async function loadRecipients() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setStatus("Sign in to view saved recipients.");
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
    setStatus("");
  }

  useEffect(() => {
    loadRecipients();
  }, []);

  if (status) {
    return <p className="mt-5 font-bold text-amber-300">{status}</p>;
  }

  if (recipients.length === 0) {
    return <p className="mt-5 text-zinc-400">No saved recipients yet.</p>;
  }

  return (
    <div className="mt-6 grid gap-4">
      {recipients.map((recipient) => (
        <div key={recipient.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <h3 className="text-xl font-black">{recipient.full_name}</h3>
          <p className="mt-2 text-sm text-zinc-400">
            DOC/Inmate #: {recipient.inmate_number || "Not provided"}
          </p>
          <p className="text-sm text-zinc-400">
            Facility: {recipient.facility_name || "Not provided"}
          </p>
          <p className="text-sm text-zinc-400">
            State: {recipient.state || "Not provided"}
          </p>
          {recipient.notes && (
            <p className="mt-3 text-sm leading-6 text-zinc-300">{recipient.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}
