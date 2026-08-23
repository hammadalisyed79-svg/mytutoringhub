"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Preview = {
  eligibleCount: number;
  excluded: {
    suspiciousName: number;
    unverifiedEmail: number;
    suspended: number;
    alreadyLive: number;
    completeButHidden: number;
  };
  email: {
    subject: string;
    cta: string;
    bodyPreview: string;
  };
};

type SendSummary = {
  eligibleAtExecution: number;
  sent: number;
  alreadyReceived: number;
  becameIneligible: number;
  failed: number;
};

export function AdminRecoveryEmail1Panel({ preview }: { preview: Preview }) {
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
          action: "send_recovery_email_1",
          confirmSend: true,
        }),
      });
      const data = (await res.json()) as SendSummary & { error?: string; ok?: boolean };
      if (!res.ok) {
        throw new Error(data.error || "Send failed");
      }
      setSummary({
        eligibleAtExecution: data.eligibleAtExecution,
        sent: data.sent,
        alreadyReceived: data.alreadyReceived,
        becameIneligible: data.becameIneligible,
        failed: data.failed,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="recovery-email1-panel">
      {!open && !summary ? (
        <button className="btn" type="button" onClick={() => setOpen(true)}>
          Send Email 1 to {preview.eligibleCount} eligible tutors
        </button>
      ) : null}

      {open ? (
        <div className="panel recovery-email1-confirm" role="dialog" aria-labelledby="recovery-email1-title">
          <h3 id="recovery-email1-title">Confirm Recovery Email 1</h3>
          <p className="muted">
            Only tutors who are <strong>currently eligible</strong> recovery candidates (verified email,
            incomplete profile, not suspended, not suspicious) will receive this message. Eligibility is
            re-checked at send time.
          </p>
          <ul className="recovery-email1-stats">
            <li>
              <strong>Eligible recipients:</strong> {preview.eligibleCount}
            </li>
            <li>
              <strong>Excluded suspicious:</strong> {preview.excluded.suspiciousName}
            </li>
            <li>
              <strong>Excluded unverified:</strong> {preview.excluded.unverifiedEmail}
            </li>
            <li>
              <strong>Excluded suspended:</strong> {preview.excluded.suspended}
            </li>
            <li>
              <strong>Excluded already live:</strong> {preview.excluded.alreadyLive}
            </li>
          </ul>
          <p>
            <strong>Subject:</strong> {preview.email.subject}
          </p>
          <p>
            <strong>CTA:</strong> {preview.email.cta}
          </p>
          <p className="muted">{preview.email.bodyPreview}</p>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="recovery-email1-actions">
            <button className="btn" type="button" disabled={busy} onClick={confirmSend}>
              {busy ? "Sending…" : "Confirm and send Email 1"}
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
          <h3>Recovery Email 1 sent</h3>
          <ul className="recovery-email1-stats">
            <li>
              <strong>Eligible at execution:</strong> {summary.eligibleAtExecution}
            </li>
            <li>
              <strong>Successfully sent:</strong> {summary.sent}
            </li>
            <li>
              <strong>Already received Email 1:</strong> {summary.alreadyReceived}
            </li>
            <li>
              <strong>Became ineligible:</strong> {summary.becameIneligible}
            </li>
            <li>
              <strong>Failed:</strong> {summary.failed}
            </li>
          </ul>
          {summary.failed > 0 ? (
            <p className="muted">
              Inspect server logs for <code>[recovery-email-1] send failed</code> (user ids only, no email
              content).
            </p>
          ) : null}
          <p className="muted">
            Nurture history:{" "}
            <a href="/admin/nurture?profile=1">Profile sequences</a> · filter{" "}
            <code>tutor_profile_r1</code>
          </p>
        </div>
      ) : null}
    </div>
  );
}
