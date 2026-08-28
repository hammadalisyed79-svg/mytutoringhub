import Link from "next/link";
import { getLivePlan } from "@/lib/plans";
import { formatPlanPrice, type CurrencyCode } from "@/lib/currency";

/**
 * Growth-tab tip: Boost / Highlight are bought per subject profile (Phase D).
 * Checkout lives on each row in the Subject profiles manager.
 */
export async function ProfileBoostPanel({
  currency,
  compact,
}: {
  currency: CurrencyCode;
  compact?: boolean;
}) {
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
            Boost or highlight each subject profile separately — students see that listing higher in
            search for ~30 days.
          </p>
        </div>
      </div>

      <p className="profile-boost-status muted">
        Open your Profile tab, pick a subject profile, then use <strong>Boost</strong> or{" "}
        <strong>Highlight</strong> on that row.
        {priceLabel ? (
          <>
            {" "}
            Boost from <strong>{priceLabel}</strong> one-time.
          </>
        ) : null}
      </p>

      <div className="profile-boost-actions">
        <Link href="/dashboard/tutor?tab=profile#subject-profiles" className="btn">
          Manage subject profiles
        </Link>
        {!compact && (
          <Link href="/pricing" className="btn btn-secondary">
            All tutor add-ons
          </Link>
        )}
      </div>
    </section>
  );
}
