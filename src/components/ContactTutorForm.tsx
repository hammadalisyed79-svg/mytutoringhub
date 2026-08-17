"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ContactTutorForm({
  recipientId,
  tutorName,
}: {
  recipientId: string;
  tutorName: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId, body }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not send message");
      return;
    }
    router.push(`/messages/${data.conversationId}`);
  }

  return (
    <form className="contact-form" onSubmit={send}>
      <h3>Contact {tutorName}</h3>
      <p className="muted">
        Lesson fees are arranged directly with your tutor in a currency you both agree on.
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={10}
        rows={5}
        placeholder="Introduce yourself and what you need help with…"
      />
      {error && <p className="form-error">{error}</p>}
      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
