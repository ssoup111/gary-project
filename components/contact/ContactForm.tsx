"use client";

import { useState } from "react";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  async function sendMessage() {
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus("Name, email, and message are required.");
      return;
    }

    setStatus("Sending message...");

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, phone, message }),
    });

    const result = await response.json();

    if (!result.success) {
      setStatus(result.error || "Message failed.");
      return;
    }

    setName("");
    setEmail("");
    setPhone("");
    setMessage("");
    setStatus("Message sent.");
  }

  return (
    <div className="grid gap-4">
      <div>
        <label className="block text-sm font-bold text-[#0A3161]/85">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-black/12 bg-white p-3 text-[#0A3161] placeholder:text-[#0A3161]/55" placeholder="Your name" />
      </div>
      <div>
        <label className="block text-sm font-bold text-[#0A3161]/85">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-black/12 bg-white p-3 text-[#0A3161] placeholder:text-[#0A3161]/55" placeholder="Email address" />
      </div>
      <div>
        <label className="block text-sm font-bold text-[#0A3161]/85">Phone <span className="font-normal text-[#0A3161]/55">(optional)</span></label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 w-full rounded-xl border border-black/12 bg-white p-3 text-[#0A3161] placeholder:text-[#0A3161]/55" placeholder="Phone number" />
      </div>
      <div>
        <label className="block text-sm font-bold text-[#0A3161]/85">Message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1.5 min-h-40 w-full rounded-xl border border-black/12 bg-white p-3 text-[#0A3161] placeholder:text-[#0A3161]/55" placeholder="How can we help?" />
      </div>

      <button type="button" onClick={sendMessage} className="rounded-xl bg-[#A6412B] px-6 py-3 font-black text-white hover:bg-[#8C3520]">
        Send Message
      </button>

      {status && <p className="font-bold text-[#A6412B]">{status}</p>}
    </div>
  );
}
