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
    <div className="grid gap-5">
      <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl border border-black/12 bg-white p-3 text-[#0A3161]" placeholder="Your name" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border border-black/12 bg-white p-3 text-[#0A3161]" placeholder="Email address" />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl border border-black/12 bg-white p-3 text-[#0A3161]" placeholder="Phone number optional" />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-40 rounded-xl border border-black/12 bg-white p-3 text-[#0A3161]" placeholder="Message" />

      <button type="button" onClick={sendMessage} className="rounded-xl bg-[#9C2B44] px-6 py-3 font-black text-white">
        Send Message
      </button>

      {status && <p className="font-bold text-[#9C2B44]">{status}</p>}
    </div>
  );
}
