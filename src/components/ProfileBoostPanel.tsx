import Link from "next/link";
import { getLivePlan } from "@/lib/plans";
import { formatPlanPrice, type CurrencyCode } from "@/lib/currency";

/**
 * Growth-tab tip: Listing Boost is bought per Teaching Profile (Marketplace V2).
 * Checkout lives on each row in My Teaching Profiles.
 */
export async function ProfileBoostPanel({
  currency,
  compact,
}: {
  currency: CurrencyCode;
  compact?: boolean;
}) {
  const plan = await getLivePlan("AD_BOOST");
  const priceLabel = plan ? formatPlanPrice(plan.chargePricePkr, currency, "once") : null;

  return (
    <section
      className={`panel profile-boost-panel${compact ? " profile-boost-panel--compact" : ""}`}
    >
      <div className="profile-boost-head">
        <div>
          <h2 style={{ marginTop: 0 }}>{plan?.name || "Listing Boost"}</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            Boost each Teaching Profile separately — stronger placement among relevant matches for
            ~30 days (never above strong subject fit).
          </p>
        </div>
      </div>

      <p className="profile-boost-status muted">
        Open your Profile tab, pick a Teaching Profile, then use <strong>Listing Boost</strong> on
        that row.
        {priceLabel ? (
          <>
            {" "}
            From <strong>{priceLabel}</strong> one-time.
          </>
        ) : null}
      </p>

      <div className="profile-boost-actions">
        <Link href="/dashboard/tutor?tab=profile#teaching-listings" className="btn">
          Manage Teaching Profiles
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
