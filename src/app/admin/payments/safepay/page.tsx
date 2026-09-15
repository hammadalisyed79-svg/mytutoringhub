import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import {
  getPaymentsReadiness,
  getSafepayCredentialStatus,
  paymentsModeLabel,
} from "@/lib/payments-status";
import { PaymentsReadinessTestButton } from "@/components/PaymentsReadinessTestButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Safepay setup" };

/**
 * Safest credentials method for MTH:
 * - Store secrets only in Vercel Environment Variables (or local .env — never commit).
 * - Never accept API secrets in a browser form or Prisma table.
 * - This page shows masked status + checklist + connection test only.
 */
export default async function AdminSafepaySetupPage() {
  await requireAdminPage();
  const readiness = getPaymentsReadiness();
  const creds = getSafepayCredentialStatus();

  return (
    <div className="stack-lg">
      <div>
        <p className="muted" style={{ margin: "0 0 0.35rem" }}>
          <Link href="/admin/payments">← Payments</Link>
        </p>
        <h1 className="page-title">Safepay credentials</h1>
        <p className="section-lead">
          {paymentsModeLabel(readiness.mode)}. Secrets are never typed into this admin form.
        </p>
      </div>

      <section
        className="panel"
        style={{
          borderColor: "rgba(185, 28, 28, 0.35)",
          background: "rgba(185, 28, 28, 0.05)",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Safest method (required)</h2>
        <p style={{ marginTop: 0 }}>
          Put final Safepay keys in <strong>Vercel → Project → Settings → Environment
          Variables</strong> (Production), then redeploy. Do <strong>not</strong> paste secrets
          into the database, chat, Notion, or an admin input field.
        </p>
        <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
          <li>Secrets in env vars stay off the public bundle and out of Prisma backups.</li>
          <li>Rotating a key = update Vercel + redeploy (no code change).</li>
          <li>Sandbox keys only with <code>SAFEPAY_ENV=sandbox</code>; live keys only with{" "}
            <code>production</code>.</li>
          <li>Never commit <code>.env</code> / <code>.env.local</code>.</li>
        </ul>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>What this runtime sees (masked)</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Values below never include the secret key. After changing Vercel env, redeploy and
          refresh this page.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ fontSize: 13 }}>
            <tbody>
              {[
                ["Mode", readiness.mode],
                ["Card checkout on Pricing", creds.checkoutLive ? (creds.env === "sandbox" ? "Yes (sandbox trial)" : "Yes (live)") : "No"],
                ["SAFEPAY_ENV", creds.env],
                ["SAFEPAY_INTENT", creds.intent],
                ["SAFEPAY_API_KEY", creds.apiKeyPresent ? creds.apiKeyHint : "(missing)"],
                ["SAFEPAY_SECRET_KEY", creds.secretPresent ? creds.secretHint : "(missing)"],
                ["Webhook auth", creds.webhookHint],
                ["NEXT_PUBLIC_APP_URL", creds.appUrl],
              ].map(([k, v]) => (
                <tr key={String(k)}>
                  <th style={{ textAlign: "left", padding: "8px 12px", whiteSpace: "nowrap" }}>
                    {k}
                  </th>
                  <td style={{ padding: "8px 12px" }}>
                    <code>{v}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaymentsReadinessTestButton />
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>
          Production checklist — paste into Vercel (Production)
        </h2>
        <ol style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: 1.55 }}>
          <li>
            Open Safepay <strong>live</strong> dashboard → Developers → API keys. Confirm merchant
            display name is <strong>My Tutoring Hub</strong>.
          </li>
          <li>
            Vercel → your project → <strong>Settings → Environment Variables</strong> →
            Environment: <strong>Production</strong>. Add:
            <pre
              style={{
                margin: "0.65rem 0",
                padding: "0.75rem 1rem",
                background: "var(--surface, #f3f4f6)",
                borderRadius: 8,
                fontSize: 12,
                overflowX: "auto",
              }}
            >{`SAFEPAY_ENV=production
SAFEPAY_API_KEY=sec_…          # live public key
SAFEPAY_SECRET_KEY=…           # live secret — never share
SAFEPAY_INTENT=CYBERSOURCE
NEXT_PUBLIC_APP_URL=https://www.mytutoringhub.com
CRON_SECRET=<long-random>
SAFEPAY_WEBHOOK_SECRET=…       # Safepay Endpoints → View shared secret (HMAC)`}</pre>
          </li>
          <li>
            In Safepay, allowlist origins / return URLs:
            <ul>
              <li>
                <code>https://www.mytutoringhub.com</code>
              </li>
              <li>
                <code>https://www.mytutoringhub.com/api/safepay/complete</code>
              </li>
            </ul>
          </li>
          <li>
            Safepay dashboard → Developers → Endpoints: URL{" "}
            <code>https://www.mytutoringhub.com/api/safepay/webhook</code>. Set{" "}
            <code>SAFEPAY_WEBHOOK_SECRET</code> to that endpoint’s{" "}
            <strong>shared secret</strong> (used for <code>X-SFPY-SIGNATURE</code> HMAC). Subscribe
            to <code>payment.succeeded</code> (v2). Dashboard “send test event” should then return
            200.
          </li>
          <li>
            <strong>Redeploy</strong> Production (env changes do not apply until redeploy).
          </li>
          <li>
            Return here → <strong>Test Safepay connection</strong> → then a small real payment
            (Student Pass or past paper).
          </li>
        </ol>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Sandbox trial (Vercel Production)</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Use this while live KYC is pending. Keys from{" "}
          <a
            href="https://sandbox.api.getsafepay.com/dashboard/developers/api"
            target="_blank"
            rel="noreferrer"
          >
            Safepay sandbox → Developers → API
          </a>
          . Set these in Vercel Production, then redeploy:
        </p>
        <pre
          style={{
            margin: "0.65rem 0",
            padding: "0.75rem 1rem",
            background: "var(--surface, #f3f4f6)",
            borderRadius: 8,
            fontSize: 12,
            overflowX: "auto",
          }}
        >{`SAFEPAY_ENV=sandbox
SAFEPAY_API_KEY=sec_…          # sandbox API key
SAFEPAY_SECRET_KEY=…           # sandbox Secret key (not sec_)
SAFEPAY_INTENT=CYBERSOURCE
NEXT_PUBLIC_APP_URL=https://www.mytutoringhub.com`}</pre>
        <p style={{ marginBottom: 0 }}>
          Then <strong>Test Safepay connection</strong> — expect “keys verified in sandbox”. Pay on
          Pricing with Safepay test cards (no real money). Switch back to production keys when KYC is
          approved.
        </p>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Local sandbox (optional)</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          For localhost only. Same sandbox keys in <code>.env.local</code> (gitignored).
        </p>
        <pre
          style={{
            margin: 0,
            padding: "0.75rem 1rem",
            background: "var(--surface, #f3f4f6)",
            borderRadius: 8,
            fontSize: 12,
            overflowX: "auto",
          }}
        >{`SAFEPAY_ENV=sandbox
SAFEPAY_API_KEY=sec_…
SAFEPAY_SECRET_KEY=…
SAFEPAY_INTENT=CYBERSOURCE
NEXT_PUBLIC_APP_URL=http://localhost:3000`}</pre>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Readiness checks</h2>
        <ul className="payments-readiness-checks">
          {readiness.checks.map((check) => (
            <li key={check.id} className={check.ok ? "is-ok" : "is-pending"}>
              <span aria-hidden="true">{check.ok ? "✓" : "○"}</span>
              <div>
                <strong>{check.label}</strong>
                {check.hint && !check.ok ? <p className="muted">{check.hint}</p> : null}
              </div>
            </li>
          ))}
        </ul>
        <p style={{ marginBottom: 0 }}>
          <Link href="/admin/payments" className="btn btn-sm btn-secondary">
            Back to payments list
          </Link>{" "}
          <Link href="/pricing" className="btn btn-sm btn-secondary">
            Open Pricing
          </Link>
        </p>
      </section>
    </div>
  );
}
