"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Msg = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  sender: { id: string; name: string };
};

export function MessageThread({
  conversationId,
  currentUserId,
}: {
  conversationId: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [otherName, setOtherName] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/messages/${conversationId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load");
      return;
    }
    setMessages(data.messages);
    const other = data.userA.id === currentUserId ? data.userB : data.userA;
    setOtherName(other.name);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`/api/messages/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Send failed");
      return;
    }
    setBody("");
    await load();
    router.refresh();
  }

  return (
    <div className="thread">
      <h2>Chat with {otherName || "…"}</h2>
      <div className="thread-messages">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`bubble ${m.senderId === currentUserId ? "mine" : "theirs"}`}
          >
            <strong>{m.sender.name}</strong>
            <p>{m.body}</p>
            <time>{new Date(m.createdAt).toLocaleString()}</time>
          </div>
        ))}
      </div>
      <form className="thread-compose" onSubmit={send}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={3}
          placeholder="Write a reply…"
        />
        {error && <p className="form-error">{error}</p>}
        <button className="btn" type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
