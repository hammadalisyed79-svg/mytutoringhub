import Link from "next/link";
import { manualPlanActivationMailto, PAYMENTS_SUPPORT_EMAIL } from "@/lib/payments-status";

export function PaymentsComingSoonBanner() {
  return (
    <aside className="payments-soon-banner" role="status">
      <strong>Card checkout opening soon</strong>
      <p>
        Safepay merchant activation is in progress. Until live card checkout is enabled,{" "}
        <strong>free tutor listings</strong> and <strong>complimentary Tutor Basic</strong> work with
        no payment. For Student Pass or paid tutor upgrades, email{" "}
        <a href={`mailto:${PAYMENTS_SUPPORT_EMAIL}`}>{PAYMENTS_SUPPORT_EMAIL}</a> — we activate plans
        manually after payment.
      </p>
      <p className="muted" style={{ marginTop: "0.65rem" }}>
        When Safepay goes live, this banner disappears automatically — no code changes needed.
      </p>
      <p className="payments-soon-banner-actions">
        <a className="btn btn-sm btn-secondary" href={manualPlanActivationMailto()}>
          Email to activate a plan
        </a>
        <Link href="/help" className="muted">
          Help &amp; FAQ
        </Link>
      </p>
    </aside>
  );
}
