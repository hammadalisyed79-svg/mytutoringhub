"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  manualActivationCtaLabel,
  manualActivationNote,
  manualActivationPricingHref,
  PAYMENTS_SUPPORT_EMAIL,
} from "@/lib/payments-status";
import type { SubscriptionPlan } from "@/lib/types";

export function ManualPlanActivationButton({
  plan,
  planName,
  label,
  featured,
  note,
  oneTime,
  subjectProfileId,
}: {
  plan?: SubscriptionPlan;
  planName: string;
  label?: string;
  featured?: boolean;
  note?: string;
  oneTime?: boolean;
  subjectProfileId?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const onPricing = pathname === "/pricing";
  const pricingHref = onPricing ? "#plans" : manualActivationPricingHref(plan, subjectProfileId);
  const pricingLabel = onPricing ? "See plans below" : "View pricing";
  const cta = label || manualActivationCtaLabel(planName);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="checkout-action">
      <button
        type="button"
        className={`btn btn-block ${featured ? "" : "btn-secondary"}`}
        onClick={() => setOpen(true)}
      >
        {cta}
      </button>
      <p className="checkout-trust muted">{note || manualActivationNote(oneTime)}</p>

      {open ? (
        <div className="manual-activation-overlay" role="presentation">
          <button
            type="button"
            className="manual-activation-scrim"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div
            className="manual-activation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="manual-activation-dialog-head">
              <h3 id={titleId} className="manual-activation-dialog-title">
                Activate {planName}
              </h3>
              <button
                ref={closeRef}
                type="button"
                className="manual-activation-dialog-close"
                aria-label="Close dialog"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="manual-activation-dialog-body">
              Secure card checkout is not available yet. Review plan details on Pricing, or contact
              billing after you pay — we activate within 24 hours.
            </p>
            <div className="manual-activation-dialog-actions">
              {onPricing ? (
                <a href={pricingHref} className="btn btn-block" onClick={() => setOpen(false)}>
                  {pricingLabel}
                </a>
              ) : (
                <Link href={pricingHref} className="btn btn-block" onClick={() => setOpen(false)}>
                  {pricingLabel}
                </Link>
              )}
              <Link
                href="/contact"
                className="btn btn-block btn-secondary"
                onClick={() => setOpen(false)}
              >
                Contact billing
              </Link>
            </div>
            <p className="muted manual-activation-dialog-email">
              Billing: {PAYMENTS_SUPPORT_EMAIL}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
