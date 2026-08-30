import Link from "next/link";
import {
  getPaymentsReadiness,
  paymentsModeLabel,
} from "@/lib/payments-status";
import { PaymentsReadinessTestButton } from "@/components/PaymentsReadinessTestButton";
import { ResendReadinessTestButton } from "@/components/ResendReadinessTestButton";

export function PaymentsReadinessPanel() {
  const readiness = getPaymentsReadiness();
  const allReady = readiness.checks.every((c) => c.ok);

  return (
    <section
      className={`panel payments-readiness-panel${readiness.checkoutLive ? " payments-readiness-panel--live" : ""}`}
    >
      <div className="payments-readiness-head">
        <div>
          <h2 style={{ marginTop: 0 }}>Safepay status</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            {paymentsModeLabel(readiness.mode)}
            {readiness.checkoutLive
              ? " — the Pricing page shows Pay with Safepay automatically."
              : " — customers see manual activation until production keys are live."}
          </p>
        </div>
        <span
          className={`payments-readiness-pill payments-readiness-pill--${readiness.mode}`}
        >
          {readiness.checkoutLive ? "Live" : readiness.mode === "sandbox" ? "Sandbox" : "Manual"}
        </span>
      </div>

      <ul className="payments-readiness-checks">
        {readiness.checks.map((check) => (
          <li key={check.id} className={check.ok ? "is-ok" : "is-pending"}>
            <span aria-hidden="true">{check.ok ? "✓" : "○"}</span>
            <div>
              <strong>{check.label}</strong>
              {check.hint && !check.ok && <p className="muted">{check.hint}</p>}
            </div>
          </li>
        ))}
      </ul>

      {!readiness.checkoutLive && (
        <div className="payments-readiness-steps">
          <h3>When Safepay approves your merchant account</h3>
          <ol>
            <li>
              Safepay dashboard → Developers → copy <strong>production</strong> API key + secret
            </li>
            <li>
              Vercel → Project → Settings → Environment Variables (Production):
              <code>SAFEPAY_ENV=production</code>, <code>SAFEPAY_API_KEY</code>,{" "}
              <code>SAFEPAY_SECRET_KEY</code>
            </li>
            <li>
              Confirm <code>NEXT_PUBLIC_APP_URL=https://www.mytutoringhub.com</code>
            </li>
            <li>
              Set <code>CRON_SECRET</code> and add Vercel cron auth header (see{" "}
              <code>vercel.json</code>)
            </li>
            <li>
              Set <code>SAFEPAY_WEBHOOK_SECRET</code> (or reuse <code>CRON_SECRET</code>) and
              configure Safepay to POST paid events to{" "}
              <code>/api/safepay/webhook</code> with <code>Authorization: Bearer …</code>
            </li>
            <li>Redeploy Production, then run <strong>Test Safepay connection</strong> below</li>
            <li>
              Make a small real payment yourself (Student Pass or Listing Boost) and confirm receipt
              email + active plan
            </li>
          </ol>
        </div>
      )}

      {allReady && readiness.checkoutLive && (
        <p className="success" style={{ marginBottom: 0 }}>
          All checks passed. Card checkout is live on Pricing, Messages, and tutor dashboards.
        </p>
      )}

      <div className="payments-readiness-actions">
        <Link href="/pricing" className="btn btn-secondary btn-sm">
          Open Pricing
        </Link>
        <Link href="/contact" className="btn btn-secondary btn-sm">
          Billing support
        </Link>
      </div>

      <PaymentsReadinessTestButton />
      <ResendReadinessTestButton />
    </section>
  );
}
