"use client";

import { useState } from "react";

export default function ContactPage() {
  const [status, setStatus] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    setIsSending(true);
    setStatus("Sending...");

    const formData = new FormData(form);

    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      message: formData.get("message"),
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setStatus("Something went wrong. Please try again.");
        return;
      }

      setStatus("✅ Your inquiry has been submitted.");
      form.reset();
    } catch (error) {
      console.error("Contact form error:", error);
      setStatus("Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "60px auto",
        padding: "30px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>Contact / Inquiry Form</h1>

      <p style={{ fontSize: "18px", lineHeight: "1.6" }}>
        Contact Gary&apos;s Picture Project about photo uploads, gallery help,
        memory preservation, or general questions.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          marginTop: "30px",
          display: "grid",
          gap: "18px",
        }}
      >
        <div>
          <label>Name</label>
          <input
            name="name"
            type="text"
            required
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "6px",
              fontSize: "16px",
            }}
          />
        </div>

        <div>
          <label>Email</label>
          <input
            name="email"
            type="email"
            required
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "6px",
              fontSize: "16px",
            }}
          />
        </div>

        <div>
          <label>Phone</label>
          <input
            name="phone"
            type="tel"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "6px",
              fontSize: "16px",
            }}
          />
        </div>

        <div>
          <label>Message</label>
          <textarea
            name="message"
            required
            rows={6}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "6px",
              fontSize: "16px",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isSending}
          style={{
            padding: "14px 24px",
            fontSize: "18px",
            cursor: isSending ? "not-allowed" : "pointer",
            borderRadius: "8px",
            border: "none",
            background: "black",
            color: "white",
          }}
        >
          {isSending ? "Sending..." : "Submit Inquiry"}
        </button>
      </form>

      {status && (
        <p style={{ marginTop: "25px", fontSize: "18px", fontWeight: "bold" }}>
          {status}
        </p>
      )}
    </main>
  );
}