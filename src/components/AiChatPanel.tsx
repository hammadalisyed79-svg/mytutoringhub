"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { id: string; role: string; content: string; createdAt?: string };

type AiChatPanelProps = {
  apiPath: string;
  initiallyConfigured: boolean;
  assistantLabel?: string;
  emptyHint?: string;
  placeholder?: string;
  compact?: boolean;
  showQuota?: boolean;
  unconfiguredMessage?: string;
};

export function AiChatPanel({
  apiPath,
  initiallyConfigured,
  assistantLabel = "Assistant",
  emptyHint = "Ask a question to get started.",
  placeholder = "Type your message…",
  compact = false,
  showQuota = true,
  unconfiguredMessage = "AI chat is unavailable right now. Please email admin@mytutoringhub.com.",
}: AiChatPanelProps) {
  const [configured, setConfigured] = useState(initiallyConfigured);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(apiPath);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load chat");
      return;
    }
    setConfigured(Boolean(data.configured));
    setMessages(data.messages || []);
    setRemaining(typeof data.remaining === "number" ? data.remaining : null);
    setError("");
  }

  useEffect(() => {
    load();
  }, [apiPath]);

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

    const res = await fetch(apiPath, {
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
    return <p className="muted ai-chat-unconfigured">{unconfiguredMessage}</p>;
  }

  return (
    <div className={`assistant-shell${compact ? " assistant-shell-compact" : ""}`}>
      {showQuota && remaining !== null && (
        <p className="muted ai-chat-quota">
          {remaining} message{remaining === 1 ? "" : "s"} left in the next 24 hours
        </p>
      )}
      <div className={`assistant-thread${compact ? " assistant-thread-compact" : ""}`}>
        {messages.length === 0 && <p className="muted">{emptyHint}</p>}
        {messages.map((m) => (
          <div key={m.id} className={`assistant-bubble ${m.role === "user" ? "mine" : "theirs"}`}>
            <strong>{m.role === "user" ? "You" : assistantLabel}</strong>
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
          rows={compact ? 2 : 3}
          required
          maxLength={4000}
          placeholder={placeholder}
          disabled={busy}
        />
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-sm" type="submit" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
