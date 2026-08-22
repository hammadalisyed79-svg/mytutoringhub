"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ResendVerificationButton } from "@/components/ResendVerificationButton";

type ContactError = {
  error?: string;
  message?: string;
  upgradeUrl?: string;
  used?: number;
  limit?: number;
};

export function ContactTutorForm({
  recipientId,
  tutorName,
  emailVerified = true,
  viewerEmail,
}: {
  recipientId: string;
  tutorName: string;
  emailVerified?: boolean;
  viewerEmail?: string | null;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<ContactError | null>(null);
  const [loading, setLoading] = useState(false);

  if (!emailVerified) {
    return (
      <div className="contact-form contact-form-embedded">
        <h3>Message {tutorName}</h3>
        <p className="muted">
          Verify your email before messaging tutors. Free accounts get 3 new contacts per month;
          Student Pass unlocks unlimited messaging.
        </p>
        <ResendVerificationButton email={viewerEmail || undefined} />
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Already verified? Refresh this page, or open{" "}
          <Link href="/dashboard">your dashboard</Link>.
        </p>
      </div>
    );
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId, body }),
    });
    const data = (await res.json()) as ContactError & { conversationId?: string };
    setLoading(false);
    if (!res.ok) {
      if (data.error === "email_unverified") {
        setError({
          error: "email_unverified",
          message: data.message || "Verify your email to send messages",
          upgradeUrl: data.upgradeUrl,
        });
        return;
      }
      setError({
        error: data.error || "send_failed",
        message:
          data.message ||
          (typeof data.error === "string" &&
          data.error !== "limit_exceeded" &&
          data.error !== "email_unverified"
            ? data.error
            : "Could not send message"),
        upgradeUrl: data.upgradeUrl,
        used: data.used,
        limit: data.limit,
      });
      return;
    }
    router.push(`/messages/${data.conversationId}`);
  }

  const isLimit = error?.error === "limit_exceeded";
  const isUnverified = error?.error === "email_unverified";
  const remaining =
    isLimit && typeof error.limit === "number" && error.limit >= 0 && typeof error.used === "number"
      ? Math.max(0, error.limit - error.used)
      : null;

  if (isUnverified) {
    return (
      <div className="contact-form contact-form-embedded">
        <h3>Message {tutorName}</h3>
        <p className="muted">{error.message || "Verify your email to send messages."}</p>
        <ResendVerificationButton email={viewerEmail || undefined} />
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          <Link href={error.upgradeUrl || "/pricing?verify=1"}>Open pricing / verify</Link>
        </p>
      </div>
    );
  }

  return (
    <form className="contact-form contact-form-embedded" onSubmit={send}>
      <h3>Message {tutorName}</h3>
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
      {error && (
        <div className="form-error" role="alert" style={{ display: "grid", gap: "0.5rem" }}>
          <p style={{ margin: 0 }}>
            {isLimit
              ? error.message ||
                `You've used all ${error.limit ?? 3} tutor contacts this month.`
              : error.message || "Could not send message"}
          </p>
          {isLimit && remaining != null && (
            <p className="muted" style={{ margin: 0 }}>
              Contacts remaining this month: {remaining} of {error.limit}.
            </p>
          )}
          {isLimit && (
            <p style={{ margin: 0 }}>
              <Link href={error.upgradeUrl || "/pricing"} className="btn btn-sm">
                Upgrade to Student Pass
              </Link>
            </p>
          )}
        </div>
      )}
      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
