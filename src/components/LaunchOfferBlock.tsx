import Link from "next/link";
import { SubscribeButton } from "@/components/SubscribeButton";
import { BUSINESS } from "@/lib/business-rules";
import {
  TUTOR_PRO_LAUNCH_BENEFITS,
  TUTOR_PRO_LAUNCH_OFFER_LABEL,
} from "@/lib/marketing-copy";
import { formatPlanPrice, type CurrencyCode } from "@/lib/currency";
import { formatPromoUntil, type ResolvedPlan } from "@/lib/plans";

/**
 * Single strong Launch offer presentation for Tutor Pro complimentary window.
 * Listing Boost / Priority Verification stay out of the primary CTA.
 */
export function LaunchOfferBlock({
  plan,
  currency,
  signedIn = false,
  paidCheckoutLive = true,
  variant = "full",
  showActivate = true,
  plansHref = "/pricing?plan=TUTOR_BASIC",
}: {
  plan: ResolvedPlan;
  currency?: CurrencyCode | string;
  signedIn?: boolean;
  paidCheckoutLive?: boolean;
  variant?: "full" | "compact";
  /** When false, only “View plans” (e.g. public marketing pages). */
  showActivate?: boolean;
  /** Deep link or in-page anchor for comparing plans. */
  plansHref?: string;
}) {
  if (!plan.isPromoActive || plan.id !== "TUTOR_BASIC") return null;

  const until = formatPromoUntil(plan.promoEndsAt) || TUTOR_PRO_LAUNCH_OFFER_LABEL;
  const listPrice =
    currency && plan.listPricePkr > 0
      ? formatPlanPrice(plan.listPricePkr, currency as CurrencyCode)
      : null;
  const label = plan.promoLabel?.trim() || TUTOR_PRO_LAUNCH_OFFER_LABEL;
  const compact = variant === "compact";
  const showPrimaryActivate = showActivate && plan.isComplimentary;
  const viewPlansSecondary = showPrimaryActivate;

  return (
    <aside
      className={`launch-offer${compact ? " launch-offer--compact" : ""}`}
      aria-labelledby="launch-offer-heading"
    >
      <p className="launch-offer-label">{label}</p>
      <h2 className="launch-offer-title" id="launch-offer-heading">
        {plan.isComplimentary
          ? `Tutor Pro free until ${until}`
          : `Tutor Pro offer until ${until}`}
      </h2>
      {!compact ? (
        <p className="launch-offer-lead">
          Activate growth tools at no charge during the Launch offer. Free listing still includes{" "}
          {BUSINESS.tutorFreeActiveListings} live Teaching Profile — permanently, not only during
          this offer.
        </p>
      ) : (
        <p className="launch-offer-lead">
          Ranking, unlimited student contacts, and up to {BUSINESS.tutorProActiveListings} live
          profiles — free until {until}.
        </p>
      )}

      {!compact ? (
        <div className="launch-offer-grid">
          <div>
            <h3 className="launch-offer-subhead">What you get free</h3>
            <ul className="launch-offer-list">
              {TUTOR_PRO_LAUNCH_BENEFITS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="launch-offer-subhead">After {until}</h3>
            <ul className="launch-offer-list">
              <li>
                Tutor Pro returns to list price
                {listPrice ? ` (${listPrice})` : ""}
              </li>
              <li>
                Free listing still includes {BUSINESS.tutorFreeActiveListings} live Teaching Profile
              </li>
              <li>
                Listing Boost and Priority Verification Review stay optional paid add-ons — not part
                of this offer
              </li>
            </ul>
          </div>
        </div>
      ) : null}

      <div className="launch-offer-ctas">
        {showPrimaryActivate && signedIn ? (
          <SubscribeButton
            plan="TUTOR_BASIC"
            planLabel="Tutor Pro"
            currency={currency}
            label="Activate Tutor Pro free"
            complimentary
            paidCheckoutLive={paidCheckoutLive}
          />
        ) : null}
        {showPrimaryActivate && !signedIn ? (
          <Link href="/register?role=tutor" className="btn">
            Join free, then activate Tutor Pro
          </Link>
        ) : null}
        <Link href={plansHref} className={`btn${viewPlansSecondary ? " btn-secondary" : ""}`}>
          View plans
        </Link>
      </div>

      {!compact ? (
        <p className="launch-offer-footnote muted">
          Listing Boost and Priority Verification Review are separate paid add-ons and are not
          complimentary under the Launch offer.
        </p>
      ) : null}
    </aside>
  );
}
