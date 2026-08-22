"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function StartMessageFromQuery({
  recipientId,
  recipientName,
  relatedAdId,
  contactsRemaining,
  contactsLimit,
  hasUnlimited,
}: {
  recipientId: string;
  recipientName?: string;
  relatedAdId?: string;
  /** Free tier: contacts left this month. Null/undefined when unlimited or unknown. */
  contactsRemaining?: number | null;
  contactsLimit?: number | null;
  hasUnlimited?: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [loading, setLoading] = useState(false);

  const blockedByQuota =
    !hasUnlimited &&
    typeof contactsRemaining === "number" &&
    contactsRemaining <= 0 &&
    typeof contactsLimit === "number" &&
    contactsLimit > 0;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (blockedByQuota) {
      setLimitHit(true);
      setError(
        `You've used all ${contactsLimit} free tutor contacts this month. Upgrade to Student Pass for unlimited messaging.`,
      );
      setUpgradeUrl("/pricing?plan=STUDENT_PASS");
      return;
    }
    setLoading(true);
    setError("");
    setUpgradeUrl(null);
    setLimitHit(false);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId, body, relatedAdId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      if (data.error === "limit_exceeded") {
        setLimitHit(true);
        setError(
          data.message ||
            "You've used all your free tutor contacts this month. Upgrade to Student Pass for unlimited messaging.",
        );
        setUpgradeUrl(data.upgradeUrl || "/pricing?plan=STUDENT_PASS");
        return;
      }
      if (data.error === "email_unverified") {
        setError(data.message || "Verify your email to send messages.");
        return;
      }
      if (data.error === "Recipient not found") {
        setError("This tutor could not be found. Open their profile and try Message again.");
        return;
      }
      setError(data.message || data.error || "Could not start conversation");
      return;
    }
    router.push(
      data.emailSent === false
        ? `/messages/${data.conversationId}?emailAlert=failed`
        : `/messages/${data.conversationId}`,
    );
  }

  if (blockedByQuota || limitHit) {
    return (
      <div className="panel contact-form" style={{ marginBottom: "1.5rem" }}>
        <h3>Messaging limit reached</h3>
        <p className="muted">
          {error ||
            `You've used all ${contactsLimit ?? 3} free tutor contacts this month. Upgrade to Student Pass for unlimited messaging.`}
        </p>
        <p>
          <Link href={upgradeUrl || "/pricing?plan=STUDENT_PASS"} className="btn">
            Upgrade to Student Pass
          </Link>{" "}
          <Link href="/search" className="btn btn-secondary">
            Back to search
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form className="panel contact-form" onSubmit={send} style={{ marginBottom: "1.5rem" }}>
      <h3>{recipientName ? `Message ${recipientName}` : "Start a conversation"}</h3>
      {hasUnlimited ? (
        <p className="muted" style={{ marginTop: 0 }}>
          Your plan includes unlimited tutor contacts this month.
        </p>
      ) : typeof contactsRemaining === "number" && typeof contactsLimit === "number" ? (
        <p className="muted" style={{ marginTop: 0 }}>
          {contactsRemaining} of {contactsLimit} free tutor contacts left this month. Replies in an
          existing chat do not use a contact.
        </p>
      ) : null}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={10}
        rows={4}
        placeholder="Introduce yourself — subject, level, and what you need help with…"
      />
      {error && <p className="form-error">{error}</p>}
      {upgradeUrl && (
        <p>
          <Link href={upgradeUrl} className="btn btn-sm">
            Upgrade to Student Pass
          </Link>
        </p>
      )}
      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
