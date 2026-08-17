"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { id: string; role: string; content: string; createdAt?: string };

export function StudyAssistantChat({ initiallyConfigured }: { initiallyConfigured: boolean }) {
  const [configured, setConfigured] = useState(initiallyConfigured);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/ai/chat");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load chat");
      return;
    }
    setConfigured(Boolean(data.configured));
    setMessages(data.messages || []);
    setRemaining(typeof data.remaining === "number" ? data.remaining : null);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    setError("");
    setBusy(true);
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "user", content: text }]);

    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json().catch(() => ({} as { error?: string; code?: string }));
    setBusy(false);
    if (!res.ok) {
      const detail = typeof data.error === "string" ? data.error : "Send failed";
      const code = typeof data.code === "string" ? data.code : "";
      setError(code ? `${detail} [${code}]` : detail);
      await load();
      return;
    }
    setMessages((prev) => [...prev, data.message]);
    if (typeof data.remaining === "number") setRemaining(data.remaining);
  }

  if (!configured) {
    return (
      <p className="panel muted">
        Study assistant is unavailable right now. An admin needs to add <code>OPENAI_API_KEY</code>.
      </p>
    );
  }

  return (
    <div className="assistant-shell">
      {remaining !== null && (
        <p className="muted" style={{ marginBottom: "0.75rem" }}>
          {remaining} message{remaining === 1 ? "" : "s"} left in the next 24 hours
        </p>
      )}
      <div className="assistant-thread">
        {messages.length === 0 && (
          <p className="muted">Ask about a concept, request practice questions, or build a study plan.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`assistant-bubble ${m.role === "user" ? "mine" : "theirs"}`}>
            <strong>{m.role === "user" ? "You" : "Assistant"}</strong>
            <p style={{ whiteSpace: "pre-wrap", margin: "0.35rem 0 0" }}>{m.content}</p>
          </div>
        ))}
        {busy && <p className="muted">Thinking…</p>}
        <div ref={bottomRef} />
      </div>
      <form className="assistant-compose" onSubmit={send}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          required
          maxLength={4000}
          placeholder="Explain quadratic equations… or quiz me on IELTS writing…"
          disabled={busy}
        />
        {error && <p className="form-error">{error}</p>}
        <button className="btn" type="submit" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
