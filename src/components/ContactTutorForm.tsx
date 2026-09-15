"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ResendVerificationButton } from "@/components/ResendVerificationButton";
import { ContextualUpgradePanel } from "@/components/ContextualUpgradePanel";
import { fireConversionEvent } from "@/components/ConversionBeacon";
import { formatPlanPrice, type CurrencyCode } from "@/lib/currency";

type ContactError = {
  error?: string;
  message?: string;
  upgradeUrl?: string;
  used?: number;
  limit?: number;
};

type ListingOption = {
  id: string;
  title: string;
  subject: string;
  rateLabel?: string;
};

export function ContactTutorForm({
  recipientId,
  tutorName,
  emailVerified = true,
  viewerEmail,
  subjectProfileId,
  listings,
  contactUsed,
  contactLimit,
  currency,
  priceLabel,
  annualPriceLabel,
  paidCheckoutLive = true,
}: {
  recipientId: string;
  tutorName: string;
  emailVerified?: boolean;
  viewerEmail?: string | null;
  subjectProfileId?: string;
  listings?: ListingOption[];
  /** Free-tier contacts used this month (omit when unlimited). */
  contactUsed?: number;
  contactLimit?: number;
  currency?: string;
  priceLabel?: string;
  annualPriceLabel?: string;
  paidCheckoutLive?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const displayCurrency = (currency as CurrencyCode) || "USD";
  const passMonthly =
    priceLabel || formatPlanPrice(1999, displayCurrency);
  const passAnnual =
    annualPriceLabel || formatPlanPrice(19190, displayCurrency, "year");
  const returnUrl =
    typeof pathname === "string" && pathname.startsWith("/")
      ? `${pathname}#message-tutor`
      : undefined;
  const [body, setBody] = useState("");
  const [listingId, setListingId] = useState(subjectProfileId || listings?.[0]?.id || "");
  const [error, setError] = useState<ContactError | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const freeLimit =
    typeof contactLimit === "number" && contactLimit > 0 ? contactLimit : null;
  const used = typeof contactUsed === "number" ? contactUsed : null;
  const remaining =
    freeLimit != null && used != null ? Math.max(0, freeLimit - used) : null;
  const nearLimit = remaining === 1;
  const showPassUpsell =
    !dismissed &&
    ((error?.error === "limit_exceeded") ||
      (freeLimit != null && used != null && used >= freeLimit));

  if (!emailVerified) {
    return (
      <div className="contact-form contact-form-embedded">
        <h3>Message {tutorName}</h3>
        <p className="muted">
          Verify your email before messaging tutors. Free accounts get 3 new tutor contacts per month;
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
    const related = listingId || subjectProfileId;
    fireConversionEvent(
      "contact_tutor_attempt",
      { listingId: related || undefined },
      `contact_attempt_${recipientId}`,
    );
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientId,
        body,
        ...(related ? { relatedAdId: related } : {}),
      }),
    });
    const data = (await res.json()) as ContactError & {
      conversationId?: string;
      isNewContact?: boolean;
    };
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
      if (data.error === "limit_exceeded") {
        fireConversionEvent(
          "student_contact_limit_reached",
          { listingId: related || undefined },
          `contact_limit_${recipientId}`,
        );
        setDismissed(false);
        setError({
          error: "limit_exceeded",
          message: data.message || "You've used your free tutor contacts this month.",
          upgradeUrl: data.upgradeUrl,
          used: data.used,
          limit: data.limit,
        });
        return;
      }
      setError({
        error: data.error || "send_failed",
        message: data.message || "Could not send message",
        upgradeUrl: data.upgradeUrl,
      });
      return;
    }
    if (data.isNewContact) {
      fireConversionEvent(
        "student_tutor_contact",
        { listingId: related || undefined },
        `contact_ok_${data.conversationId || recipientId}`,
      );
    }
    router.push(`/messages/${data.conversationId}`);
  }

  const isLimit = error?.error === "limit_exceeded";
  const limitUsed = error?.used ?? used ?? freeLimit ?? 3;
  const limitMax = error?.limit ?? freeLimit ?? 3;

  if (showPassUpsell || isLimit) {
    return (
      <div className="contact-form contact-form-embedded">
        <h3>Message {tutorName}</h3>
        <p className="muted" style={{ marginBottom: "0.75rem" }}>
          You&apos;ve used your {limitMax} free tutor contacts this month.
        </p>
        <ContextualUpgradePanel
          title="Get Student Pass"
          lead="Unlimited new tutor contacts so you can keep messaging."
          plan="STUDENT_PASS"
          planLabel="Student Pass"
          priceLabel={passMonthly}
          billingLabel="Billed monthly"
          annualOption={{
            monthlyLabel: passMonthly,
            annualLabel: passAnnual,
          }}
          benefits={[
            "Unlimited tutor contacts",
            "Post tutor requests",
            "10 eligible Past Paper downloads/month",
          ]}
          ctaLabel="Get Student Pass"
          maybeLaterHref={returnUrl || pathname || "/search"}
          maybeLaterLabel="Maybe later"
          currency={displayCurrency}
          paidCheckoutLive={paidCheckoutLive}
          returnUrl={returnUrl}
          trigger="contact_limit"
          sourcePage="tutor_contact"
        />
      </div>
    );
  }

  return (
    <form className="contact-form contact-form-embedded" onSubmit={send}>
      <h3>Message {tutorName}</h3>
      {nearLimit ? (
        <p className="muted contact-quota-hint">
          1 free tutor contact remaining this month · Student Pass unlocks unlimited.
        </p>
      ) : remaining != null && remaining > 0 ? (
        <p className="muted contact-quota-hint">
          {remaining} of {freeLimit} free tutor contacts remaining this month.
        </p>
      ) : null}
      {listings && listings.length > 1 && (
        <label>
          About which lesson?
          <select
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            aria-label="Teaching Profile for this message"
          >
            {listings.map((row) => (
              <option key={row.id} value={row.id}>
                {row.title || row.subject}
                {row.rateLabel ? ` · ${row.rateLabel}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={10}
        rows={5}
        placeholder="Introduce yourself and what you need help with…"
        aria-label={`Message to ${tutorName}`}
      />
      {error && (
        <div className="form-error" role="alert">
          <p style={{ margin: 0 }}>{error.message || "Could not send message"}</p>
          {error.error === "email_unverified" && (
            <p style={{ margin: "0.5rem 0 0" }}>
              <Link href={error.upgradeUrl || "/pricing?verify=1"}>Open pricing / verify</Link>
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
