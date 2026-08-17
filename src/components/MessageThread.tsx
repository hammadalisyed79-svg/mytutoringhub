"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RequestReviewButton } from "@/components/RequestReviewButton";
import { isImageAttachment } from "@/lib/media";

type Msg = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  readAt: string | null;
  attachmentUrl?: string | null;
  sender: { id: string; name: string };
};

type ReviewMeta = {
  studentId: string;
  tutorProfileId: string;
} | null;

export function MessageThread({
  conversationId,
  currentUserId,
}: {
  conversationId: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const listRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [otherName, setOtherName] = useState("");
  const [reviewMeta, setReviewMeta] = useState<ReviewMeta>(null);
  const [body, setBody] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function load(opts?: { refreshNav?: boolean }) {
    const res = await fetch(`/api/messages/${conversationId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load");
      return;
    }
    setMessages(data.messages);
    const other = data.userA.id === currentUserId ? data.userB : data.userA;
    setOtherName(other.name);
    setReviewMeta(data.reviewRequest || null);
    if (opts?.refreshNav) routerRef.current.refresh();
  }

  useEffect(() => {
    load({ refreshNav: true });
    const tick = setInterval(() => load(), 12000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setAttachmentUrl(data.url);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (sending || uploading) return;
    setError("");
    setSending(true);
    const res = await fetch(`/api/messages/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: body.trim(),
        ...(attachmentUrl ? { attachmentUrl } : {}),
      }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(data.error || "Send failed");
      return;
    }
    setBody("");
    setAttachmentUrl("");
    await load({ refreshNav: true });
  }

  return (
    <div className="thread">
      <h2>Chat with {otherName || "…"}</h2>
      {reviewMeta && (
        <RequestReviewButton
          studentId={reviewMeta.studentId}
          tutorProfileId={reviewMeta.tutorProfileId}
        />
      )}
      <div className="thread-messages" ref={listRef}>
        {messages.length === 0 && (
          <p className="muted">No messages yet. Say hello or attach a photo.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`bubble ${m.senderId === currentUserId ? "mine" : "theirs"}`}
          >
            <strong>{m.sender.name}</strong>
            {m.attachmentUrl &&
              (isImageAttachment(m.attachmentUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="bubble-image" src={m.attachmentUrl} alt="Attachment" />
              ) : (
                <p>
                  <a href={m.attachmentUrl} target="_blank" rel="noreferrer">
                    View attachment
                  </a>
                </p>
              ))}
            {m.body ? <p>{m.body}</p> : null}
            <time>
              {new Date(m.createdAt).toLocaleString()}
              {m.senderId === currentUserId && (
                <span className="receipt">{m.readAt ? "Seen" : "Sent"}</span>
              )}
            </time>
          </div>
        ))}
      </div>
      <form className="thread-compose" onSubmit={send}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Write a reply or attach a photo…"
        />
        {attachmentUrl && (
          <div className="thread-attach-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={attachmentUrl} alt="" />
            <button type="button" className="link-btn" onClick={() => setAttachmentUrl("")}>
              Remove photo
            </button>
          </div>
        )}
        <div className="thread-compose-actions">
          <label className="btn btn-secondary btn-sm thread-attach-btn">
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onFile} />
            {uploading ? "Uploading…" : attachmentUrl ? "Change photo" : "Attach photo"}
          </label>
          <button className="btn" type="submit" disabled={sending || uploading}>
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>
    </div>
  );
}
