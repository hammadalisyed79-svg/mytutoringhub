import Link from "next/link";
import { manualPlanActivationMailto, PAYMENTS_SUPPORT_EMAIL } from "@/lib/payments-status";

export function PaymentsComingSoonBanner() {
  return (
    <aside className="payments-soon-banner" role="status">
      <strong>Secure checkout launching soon</strong>
      <p>
        Free tutor listings and complimentary Tutor Pro are available now with no payment. For
        Student Pass and paid tutor upgrades, contact us at{" "}
        <a href={`mailto:${PAYMENTS_SUPPORT_EMAIL}`}>{PAYMENTS_SUPPORT_EMAIL}</a> — we activate plans
        within 24 hours after payment.
      </p>
      <p className="payments-soon-banner-actions">
        <a className="btn btn-sm" href={manualPlanActivationMailto()}>
          Request plan activation
        </a>
        <Link href="/contact" className="muted">
          Contact billing
        </Link>
        <Link href="/help" className="muted">
          Help &amp; FAQ
        </Link>
      </p>
    </aside>
  );
}
