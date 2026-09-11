"use client";

import { useState } from "react";
import Link from "next/link";
import { GuestPaperCheckout } from "@/components/GuestPaperCheckout";
import { fireConversionEvent } from "@/components/ConversionBeacon";

export type PaperAccessStatus =
  | "included"
  | "available_with_plan"
  | "individually_purchasable"
  | "unavailable"
  | "owned";

export function PastPaperBuyButton({
  catalogKey,
  available,
  owned,
  feeLabel,
  feePkr,
  signedIn,
  guestToken,
  accessStatus,
}: {
  catalogKey: string;
  available: boolean;
  owned: boolean;
  feeLabel: string;
  feePkr: number;
  signedIn: boolean;
  guestToken?: string | null;
  /** When set, shows clear entitlement labelling without changing prices. */
  accessStatus?: PaperAccessStatus;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);

  const status: PaperAccessStatus =
    accessStatus ||
    (!available
      ? "unavailable"
      : owned
        ? "owned"
        : feePkr > 0
          ? "individually_purchasable"
          : "available_with_plan");

  if (status === "unavailable" || !available) {
    return (
      <div className="paper-access">
        <span className="paper-soon muted">Unavailable</span>
        <p className="field-hint" style={{ margin: "0.25rem 0 0" }}>
          No file for this paper yet.
        </p>
      </div>
    );
  }

  const statusLabel =
    status === "owned" || owned
      ? "Included (purchased)"
      : status === "included"
        ? "Included with your plan"
        : status === "available_with_plan"
          ? "Available with Student Pass / Pro"
          : "Individually purchasable";

  const priceSuffix = feeLabel === "Free" ? "Free" : feeLabel;
  const actionLabel =
    status === "owned" || owned
      ? `Download · Included`
      : status === "included"
        ? `Download · Included`
        : `View / Download · ${priceSuffix}`;

  const downloadHref =
    guestToken && !signedIn
      ? `/api/past-papers/download?key=${encodeURIComponent(catalogKey)}&token=${encodeURIComponent(guestToken)}`
      : `/api/past-papers/download?key=${encodeURIComponent(catalogKey)}`;

  if (owned || (guestToken && !signedIn)) {
    return (
      <div className="paper-access">
        <span className="muted paper-access-label">{statusLabel}</span>
        <a className="btn btn-sm" href={downloadHref}>
          {actionLabel}
        </a>
      </div>
    );
  }

  if (!signedIn) {
    if (feePkr > 0) {
      return (
        <div className="paper-access">
          <span className="muted paper-access-label">Individually purchasable</span>
          <GuestPaperCheckout catalogKey={catalogKey} feeLabel={feeLabel} />
        </div>
      );
    }
    return (
      <div className="paper-access">
        <span className="muted paper-access-label">Available with plan</span>
        <a className="btn btn-sm" href="/login">
          Sign in · {actionLabel}
        </a>
      </div>
    );
  }

  async function buy() {
    setBusy(true);
    setError("");
    setUpgradeUrl(null);
    const res = await fetch("/api/past-papers/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catalogKey }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
      message?: string;
      upgradeUrl?: string;
    };
    setBusy(false);
    if (!res.ok) {
      if (data.error === "paper_limit_exceeded") {
        fireConversionEvent(
          "past_paper_quota_exhausted",
          { catalogKey },
          `paper_quota_${catalogKey}`,
        );
        fireConversionEvent("student_pro_upsell_view", { source: "paper_quota" }, `pro_upsell_paper_${catalogKey}`);
        setUpgradeUrl(data.upgradeUrl || "/pricing?plan=STUDENT_PRO");
        setError(
          data.message ||
            "You've used all 10 included past paper downloads this month. Upgrade to Student Pro for unlimited eligible downloads.",
        );
        return;
      }
      setError(data.message || data.error || "Could not start checkout");
      return;
    }
    if (data.url) window.location.href = data.url;
  }

  if (upgradeUrl) {
    return (
      <div className="paper-access">
        <p className="form-error" style={{ marginTop: 0 }}>
          {error}
        </p>
        <p style={{ margin: "0.5rem 0 0", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link href={upgradeUrl} className="btn btn-sm">
            View Student Pro
          </Link>
          {feePkr > 0 ? (
            <button className="btn btn-sm btn-secondary" type="button" onClick={buy} disabled={busy}>
              {busy ? "Opening…" : `Buy this paper · ${feeLabel}`}
            </button>
          ) : null}
        </p>
      </div>
    );
  }

  return (
    <div className="paper-buy paper-access">
      <span className="muted paper-access-label">{statusLabel}</span>
      <button className="btn btn-sm" type="button" onClick={buy} disabled={busy}>
        {busy ? "Opening…" : actionLabel}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
