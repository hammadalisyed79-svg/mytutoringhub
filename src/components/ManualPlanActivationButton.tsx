"use client";

import { manualPlanActivationMailto } from "@/lib/payments-status";

export function ManualPlanActivationButton({
  planName,
  label,
  featured,
  note = "Card checkout opening soon · Manual activation available",
}: {
  planName: string;
  label?: string;
  featured?: boolean;
  note?: string;
}) {
  return (
    <div className="checkout-action">
      <a
        className={`btn btn-block ${featured ? "" : "btn-secondary"}`}
        href={manualPlanActivationMailto(planName)}
      >
        {label || `Email to activate ${planName}`}
      </a>
      <p className="checkout-trust muted">{note}</p>
    </div>
  );
}
