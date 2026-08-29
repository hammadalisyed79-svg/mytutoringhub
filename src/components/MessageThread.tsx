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
  viewerRole,
  emailAlertFailed,
}: {
  conversationId: string;
  currentUserId: string;
  viewerRole?: string;
  emailAlertFailed?: boolean;
}) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const listRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [otherName, setOtherName] = useState("");
  const [otherRole, setOtherRole] = useState<string | null>(null);
  const [reviewMeta, setReviewMeta] = useState<ReviewMeta>(null);
  const [body, setBody] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendPulse, setSendPulse] = useState(false);
  const [enteringIds, setEnteringIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

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
    setOtherRole(other.role || null);
    setReviewMeta(data.reviewRequest || null);
    if (opts?.refreshNav) routerRef.current.refresh();
  }

  useEffect(() => {
    load({ refreshNav: true });
    const tick = setInterval(() => load(), 5000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (emailAlertFailed) {
      setInfo(
        "Message saved in chat. Email alert could not be sent — the tutor will still see it when they log in to Messages.",
      );
    }
  }, [emailAlertFailed]);

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
    const trimmed = body.trim();
    if (!trimmed && !attachmentUrl) {
      setError("Write a message or attach a document.");
      return;
    }
    setError("");
    setInfo("");
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: trimmed,
          ...(attachmentUrl ? { attachmentUrl } : {}),
        }),
      });
      let data: { error?: string; message?: string; id?: string; emailSent?: boolean } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok) {
        setError(data.message || data.error || "Send failed. Try again.");
        return;
      }
      setBody("");
      setAttachmentUrl("");
      if (data.id) {
        setEnteringIds((prev) => [...prev, data.id as string]);
        setSendPulse(true);
        window.setTimeout(() => setSendPulse(false), 520);
      }
      await load({ refreshNav: true });
      if (data.emailSent === false) {
        setInfo(
          "Message delivered in chat. Email alert could not be sent — the tutor will still see it when they log in to Messages.",
        );
      }
    } catch {
      setError("Network error — your message may not have sent. Refresh and check the thread.");
    } finally {
      setSending(false);
    }
  }

  const tutorReplied = messages.some((m) => m.senderId !== currentUserId);
  const myMessages = messages.filter((m) => m.senderId === currentUserId);
  const tutorHasSeen = myMessages.some((m) => m.readAt);
  const waitingOnTutor =
    viewerRole === "STUDENT" && otherRole === "TUTOR" && myMessages.length > 0 && !tutorReplied;

  return (
    <div className="thread">
      <h2>Chat with {otherName || "…"}</h2>
      {waitingOnTutor && (
        <p
          className="muted"
          style={{
            margin: "0 0 1rem",
            padding: "0.65rem 0.9rem",
            background: "rgba(15, 90, 70, 0.06)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.88rem",
          }}
        >
          {tutorHasSeen
            ? "The tutor has opened this chat. Waiting for their reply."
            : "Your messages are delivered to the tutor's inbox. They must log in to their own account to read and reply. You'll see Seen when they open this chat."}
        </p>
      )}
      {reviewMeta && (
        <RequestReviewButton
          studentId={reviewMeta.studentId}
          tutorProfileId={reviewMeta.tutorProfileId}
        />
      )}
      <div className="thread-messages" ref={listRef}>
        {messages.length === 0 && (
          <p className="muted">No messages yet. Say hello or attach a document.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`bubble ${m.senderId === currentUserId ? "mine" : "theirs"}${
              enteringIds.includes(m.id) ? " bubble--enter" : ""
            }`}
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
                <span className="receipt">{m.readAt ? "Seen" : "Delivered"}</span>
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
          placeholder="Write a reply or attach a document…"
          aria-label="Message reply"
        />
        {attachmentUrl && (
          <div className="thread-attach-preview">
            {isImageAttachment(attachmentUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attachmentUrl} alt="" />
            ) : (
              <p style={{ margin: 0 }}>
                <a href={attachmentUrl} target="_blank" rel="noreferrer">
                  Document attached
                </a>
              </p>
            )}
            <button type="button" className="link-btn" onClick={() => setAttachmentUrl("")}>
              Remove document
            </button>
          </div>
        )}
        <div className="thread-compose-actions">
          <label className="btn btn-secondary btn-sm thread-attach-btn">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              onChange={onFile}
            />
            {uploading ? "Uploading…" : attachmentUrl ? "Change document" : "Attach document"}
          </label>
          <button
            className={`btn${sendPulse ? " btn--sent" : ""}`}
            type="submit"
            disabled={sending || uploading}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
        {info && (
          <p className="muted" style={{ margin: "0.5rem 0 0" }}>
            {info}
          </p>
        )}
        {error && <p className="form-error">{error}</p>}
      </form>
    </div>
  );
}
