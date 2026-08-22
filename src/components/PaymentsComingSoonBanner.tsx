import Link from "next/link";
import { manualPlanActivationMailto, PAYMENTS_SUPPORT_EMAIL } from "@/lib/payments-status";

export function PaymentsComingSoonBanner() {
  return (
    <aside className="payments-soon-banner" role="status">
      <strong>Card checkout opening soon</strong>
      <p>
        Safepay is being activated for worldwide card payments. Until then,{" "}
        <strong>free tutor listings</strong> and <strong>complimentary Tutor Basic</strong> work
        with no payment. For Student Pass or paid tutor upgrades, email{" "}
        <a href={`mailto:${PAYMENTS_SUPPORT_EMAIL}`}>{PAYMENTS_SUPPORT_EMAIL}</a> and we will
        activate your plan manually after payment.
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
