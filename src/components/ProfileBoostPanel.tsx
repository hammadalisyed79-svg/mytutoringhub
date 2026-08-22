import Link from "next/link";
import { SubscribeButton } from "@/components/SubscribeButton";
import { getLivePlan } from "@/lib/plans";
import { isBoostActive } from "@/lib/subscription";
import { formatPlanPrice, type CurrencyCode } from "@/lib/currency";

export async function ProfileBoostPanel({
  boostUntil,
  currency,
  compact,
}: {
  boostUntil: Date | null | undefined;
  currency: CurrencyCode;
  compact?: boolean;
}) {
  const now = new Date();
  const active = isBoostActive(boostUntil, now);
  const plan = await getLivePlan("AD_BOOST");
  const priceLabel = plan ? formatPlanPrice(plan.chargePricePkr, currency) : null;

  return (
    <section
      className={`panel profile-boost-panel${compact ? " profile-boost-panel--compact" : ""}`}
    >
      <div className="profile-boost-head">
        <div>
          <h2 style={{ marginTop: 0 }}>{plan?.name || "Profile Boost"}</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            One-time checkout · 30 days of extra search visibility · periodic top-of-list placement
          </p>
        </div>
        {active && boostUntil && (
          <span className="profile-boost-badge">Boost active</span>
        )}
      </div>

      {boostUntil && boostUntil > now ? (
        <p className="profile-boost-status">
          {active ? "You are boosted in search right now." : "Boost window active — cycles on periodically."}{" "}
          Until {boostUntil.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.
        </p>
      ) : (
        <p className="profile-boost-status muted">
          Stand out when students compare tutors. Repurchasing extends your boost window by 30 days.
        </p>
      )}

      <div className="profile-boost-actions">
        {priceLabel && (
          <p className="profile-boost-price">
            <strong>{priceLabel}</strong>
            <span className="muted"> one-time · 30 days</span>
          </p>
        )}
        <SubscribeButton
          plan="AD_BOOST"
          currency={currency}
          label={active ? "Extend boost 30 days" : "Boost my profile"}
          featured
          oneTime
        />
        {!compact && (
          <Link href="/pricing" className="btn btn-secondary">
            All tutor add-ons
          </Link>
        )}
      </div>
    </section>
  );
}
