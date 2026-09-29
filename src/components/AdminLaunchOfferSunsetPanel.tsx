"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Preview = {
  promoActive: boolean;
  untilLabel: string;
  eligibleCount: number;
  withTutorPro: number;
  withoutTutorPro: number;
  email: { subject: string; cta: string; bodyPreview: string };
};

type SendSummary = {
  eligibleAtExecution: number;
  sent: number;
  alreadyReceived: number;
  becameIneligible: number;
  failed: number;
  promoInactive?: boolean;
};

export function AdminLaunchOfferSunsetPanel({ preview }: { preview: Preview }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<SendSummary | null>(null);

  async function confirmSend() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_launch_offer_sunset",
          confirmSend: true,
        }),
      });
      const data = (await res.json()) as SendSummary & { error?: string };
      if (!res.ok) throw new Error(data.error || "Send failed");
      setSummary({
        eligibleAtExecution: data.eligibleAtExecution,
        sent: data.sent,
        alreadyReceived: data.alreadyReceived,
        becameIneligible: data.becameIneligible,
        failed: data.failed,
        promoInactive: data.promoInactive,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  if (!preview.promoActive && !summary) {
    return (
      <p className="muted">
        Launch offer is not active — sunset email is unavailable. Update promo dates in Admin →
        Pricing if you need to reopen it.
      </p>
    );
  }

  return (
    <div className="recovery-email1-panel">
      {!open && !summary ? (
        <button className="btn" type="button" onClick={() => setOpen(true)}>
          Send Launch offer sunset to {preview.eligibleCount} tutors
        </button>
      ) : null}

      {open ? (
        <div className="panel recovery-email1-confirm" role="dialog" aria-labelledby="sunset-email-title">
          <h3 id="sunset-email-title">Confirm Launch offer sunset email</h3>
          <p className="muted">
            Sends once per tutor (sequence <code>tutor_launch_offer_sunset</code>). Ends{" "}
            <strong>{preview.untilLabel}</strong>. Copy differs for tutors already on complimentary
            Tutor Pro vs those who have not activated yet.
          </p>
          <ul className="recovery-email1-stats">
            <li>
              <strong>Eligible tutors:</strong> {preview.eligibleCount}
            </li>
            <li>
              <strong>Already on Tutor Pro:</strong> {preview.withTutorPro}
            </li>
            <li>
              <strong>Not on Tutor Pro yet:</strong> {preview.withoutTutorPro}
            </li>
          </ul>
          <p>
            <strong>Subject pattern:</strong> {preview.email.subject}
          </p>
          <p className="muted">{preview.email.bodyPreview}</p>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="recovery-email1-actions">
            <button className="btn" type="button" disabled={busy} onClick={confirmSend}>
              {busy ? "Sending…" : "Confirm and send sunset email"}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {summary ? (
        <div className="panel recovery-email1-result" role="status">
          <h3>Launch offer sunset email</h3>
          {summary.promoInactive ? (
            <p>Promo was inactive at send time — nothing sent.</p>
          ) : (
            <ul className="recovery-email1-stats">
              <li>
                <strong>Eligible at execution:</strong> {summary.eligibleAtExecution}
              </li>
              <li>
                <strong>Successfully sent:</strong> {summary.sent}
              </li>
              <li>
                <strong>Already received:</strong> {summary.alreadyReceived}
              </li>
              <li>
                <strong>Became ineligible:</strong> {summary.becameIneligible}
              </li>
              <li>
                <strong>Failed:</strong> {summary.failed}
              </li>
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
