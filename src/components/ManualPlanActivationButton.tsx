"use client";

import {
  manualActivationCtaLabel,
  manualActivationNote,
  manualPlanActivationMailto,
} from "@/lib/payments-status";

export function ManualPlanActivationButton({
  planName,
  label,
  featured,
  note,
  accountEmail,
  oneTime,
}: {
  planName: string;
  label?: string;
  featured?: boolean;
  note?: string;
  accountEmail?: string;
  oneTime?: boolean;
}) {
  return (
    <div className="checkout-action">
      <a
        className={`btn btn-block ${featured ? "" : "btn-secondary"}`}
        href={manualPlanActivationMailto(planName, accountEmail)}
      >
        {label || manualActivationCtaLabel(planName)}
      </a>
      <p className="checkout-trust muted">{note || manualActivationNote(oneTime)}</p>
    </div>
  );
}
