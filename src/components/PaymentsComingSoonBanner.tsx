"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PAYMENTS_SUPPORT_EMAIL } from "@/lib/payments-status";

export function PaymentsComingSoonBanner() {
  const pathname = usePathname();
  const onPricing = pathname === "/pricing";

  return (
    <aside className="payments-soon-banner" role="status">
      <strong>Secure checkout launching soon</strong>
      <p>
        Free Teaching Profiles and complimentary Tutor Pro are available now with no payment. For
        Student Pass and paid tutor upgrades, use Contact billing after you pay — we activate plans
        within 24 hours. Support: {PAYMENTS_SUPPORT_EMAIL}.
      </p>
      <p className="payments-soon-banner-actions">
        {onPricing ? (
          <a className="btn btn-sm" href="#plans">
            See plans below
          </a>
        ) : (
          <Link className="btn btn-sm" href="/pricing">
            View plans &amp; pricing
          </Link>
        )}
        <Link href="/contact" className="btn btn-sm btn-secondary">
          Contact billing
        </Link>
        <Link href="/help" className="muted">
          Help &amp; FAQ
        </Link>
      </p>
    </aside>
  );
}
