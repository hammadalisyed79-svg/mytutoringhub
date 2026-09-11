"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fireConversionEvent } from "@/components/ConversionBeacon";

export function StartMessageFromQuery({
  recipientId,
  recipientName,
  relatedAdId,
  contactsRemaining,
  contactsLimit,
  hasUnlimited,
  audience = "student",
}: {
  recipientId: string;
  recipientName?: string;
  relatedAdId?: string;
  /** Free tier: contacts / reveals left this month. Null when unlimited or unknown. */
  contactsRemaining?: number | null;
  contactsLimit?: number | null;
  hasUnlimited?: boolean;
  /** Student→tutor uses Student Pass; tutor→student uses Tutor Pro. */
  audience?: "student" | "tutor";
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [loading, setLoading] = useState(false);

  const isTutor = audience === "tutor";
  const defaultUpgrade = isTutor ? "/pricing?plan=TUTOR_BASIC" : "/pricing?plan=STUDENT_PASS";
  const upgradeLabel = isTutor ? "Activate Tutor Pro" : "Upgrade to Student Pass";
  const limitNoun = isTutor ? "enquiry reveals" : "tutor contacts";
  const limitNounSingular = isTutor ? "enquiry reveal" : "tutor contact";

  const blockedByQuota =
    !hasUnlimited &&
    typeof contactsRemaining === "number" &&
    contactsRemaining <= 0 &&
    typeof contactsLimit === "number" &&
    contactsLimit > 0;

  function fireLimitAnalytics(source: string) {
    if (isTutor) {
      fireConversionEvent(
        "enquiry_reveal_limit_reached",
        { source },
        `reveal_limit_${recipientId}`,
      );
      fireConversionEvent("tutor_pro_upsell_view", { source }, `tutor_pro_upsell_${recipientId}`);
    } else {
      fireConversionEvent(
        "student_contact_limit_reached",
        { source },
        `contact_limit_${recipientId}`,
      );
      fireConversionEvent(
        "student_pass_upsell_view",
        { source },
        `pass_upsell_${recipientId}`,
      );
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (blockedByQuota) {
      setLimitHit(true);
      setError(
        isTutor
          ? `You've used all ${contactsLimit} free ${limitNoun} this month. Activate Tutor Pro for unlimited student messages.`
          : `You've used all ${contactsLimit} free ${limitNoun} this month. Upgrade to Student Pass for unlimited messaging.`,
      );
      setUpgradeUrl(defaultUpgrade);
      fireLimitAnalytics("compose_precheck");
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
            (isTutor
              ? `You've used all your free ${limitNoun} this month. Activate Tutor Pro for unlimited student messages.`
              : `You've used all your free ${limitNoun} this month. Upgrade to Student Pass for unlimited messaging.`),
        );
        setUpgradeUrl(data.upgradeUrl || defaultUpgrade);
        fireLimitAnalytics("api_limit");
        return;
      }
      if (data.error === "email_unverified") {
        setError(data.message || "Verify your email to send messages.");
        return;
      }
      if (data.error === "Recipient not found") {
        setError(
          isTutor
            ? "This student could not be found. Open their request and try Message again."
            : "This tutor could not be found. Open their profile and try Message again.",
        );
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
            `You've used all ${contactsLimit ?? (isTutor ? 3 : 3)} free ${limitNoun} this month. ${
              isTutor
                ? "Activate Tutor Pro for unlimited student messages."
                : "Upgrade to Student Pass for unlimited messaging."
            }`}
        </p>
        <p>
          <Link href={upgradeUrl || defaultUpgrade} className="btn">
            {upgradeLabel}
          </Link>{" "}
          <Link href={isTutor ? "/ads" : "/search"} className="btn btn-secondary">
            {isTutor ? "Back to requests" : "Back to search"}
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
          {isTutor
            ? "Your plan includes unlimited enquiry reveals this month."
            : "Your plan includes unlimited tutor contacts this month."}
        </p>
      ) : typeof contactsRemaining === "number" && typeof contactsLimit === "number" ? (
        <p className="muted" style={{ marginTop: 0 }}>
          {contactsRemaining} of {contactsLimit} free {limitNounSingular}
          {contactsRemaining === 1 ? "" : "s"} left this month. Replies in an existing chat do not
          use a {isTutor ? "reveal" : "contact"}.
        </p>
      ) : null}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={10}
        rows={4}
        placeholder={
          isTutor
            ? "Introduce yourself — how you can help with their subject and availability…"
            : "Introduce yourself — subject, level, and what you need help with…"
        }
      />
      {error && <p className="form-error">{error}</p>}
      {upgradeUrl && (
        <p>
          <Link href={upgradeUrl} className="btn btn-sm">
            {upgradeLabel}
          </Link>
        </p>
      )}
      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
