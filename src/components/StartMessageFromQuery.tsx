"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StartMessageFromQuery({
  recipientId,
  relatedAdId,
}: {
  recipientId: string;
  relatedAdId?: string;
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
      body: JSON.stringify({ recipientId, body, relatedAdId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not start conversation");
      return;
    }
    router.push(`/messages/${data.conversationId}`);
  }

  return (
    <form className="contact-form" onSubmit={send} style={{ marginBottom: "1.5rem" }}>
      <h3>Start a conversation</h3>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={10}
        rows={4}
        placeholder="Introduce yourself…"
      />
      {error && <p className="form-error">{error}</p>}
      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
