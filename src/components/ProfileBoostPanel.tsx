import Link from "next/link";
import { getLivePlan } from "@/lib/plans";
import { formatPlanPrice, type CurrencyCode } from "@/lib/currency";

/**
 * Growth-tab tip: Boost / Highlight are bought per teaching listing (Marketplace V2).
 * Checkout lives on each row in the Teaching listings manager.
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
          <h2 style={{ marginTop: 0 }}>{plan?.name || "Listing Boost"}</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            Boost or highlight each teaching listing separately — students see that service higher in
            search for ~30 days.
          </p>
        </div>
      </div>

      <p className="profile-boost-status muted">
        Open your Profile tab, pick a teaching listing, then use <strong>Boost</strong> or{" "}
        <strong>Highlight</strong> on that row.
        {priceLabel ? (
          <>
            {" "}
            Boost from <strong>{priceLabel}</strong> one-time.
          </>
        ) : null}
      </p>

      <div className="profile-boost-actions">
        <Link href="/dashboard/tutor?tab=profile#teaching-listings" className="btn">
          Manage teaching listings
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
