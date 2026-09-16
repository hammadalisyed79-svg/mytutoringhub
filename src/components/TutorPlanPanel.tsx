import Link from "next/link";
import { getPlan, type ResolvedPlan } from "@/lib/plans";
import { SubscribeButton } from "@/components/SubscribeButton";
import { RecoverPaymentForm } from "@/components/RecoverPaymentForm";
import { BUSINESS } from "@/lib/business-rules";
import { TUTOR_PRO_LAUNCH_OFFER_LABEL } from "@/lib/marketing-copy";
import { formatPromoUntil } from "@/lib/plans";

type PlanSubscription = {
  id: string;
  plan: string;
  currentPeriodEnd: Date | null;
  stripeSubscriptionId: string | null;
};

function planVisual(planId: string) {
  switch (planId) {
    case "TUTOR_BASIC":
      return { icon: "◇", eyebrow: "Core membership" };
    case "VERIFIED_TUTOR":
      return { icon: "✦", eyebrow: "Trust & verification" };
    case "HIGHLIGHTED_AD":
    case "AD_BOOST":
      return { icon: "◆", eyebrow: "Visibility boost" };
    default:
      return { icon: "◆", eyebrow: "Tutor add-on" };
  }
}

function formatRenewal(date: Date | null) {
  if (!date) return "Active";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TutorPlanPanel({
  corePlan,
  addOnSubs,
  pendingSubs,
  currency,
  paidCheckoutLive,
  tutorProPlan,
}: {
  corePlan: PlanSubscription | undefined;
  addOnSubs: PlanSubscription[];
  pendingSubs: PlanSubscription[];
  currency: string;
  paidCheckoutLive: boolean;
  /** Live Tutor Pro plan — used to gate Launch offer CTA by promoUntil. */
  tutorProPlan?: ResolvedPlan | null;
}) {
  const activePlans = [
    ...(corePlan ? [corePlan] : []),
    ...addOnSubs.filter((sub) => !corePlan || sub.id !== corePlan.id),
  ];
  const hasBenefits = activePlans.length > 0;

  const launchActive = Boolean(tutorProPlan?.isPromoActive && tutorProPlan?.isComplimentary);
  const untilLabel = tutorProPlan?.promoEndsAt
    ? formatPromoUntil(tutorProPlan.promoEndsAt)
    : null;

  return (
    <section className="tutor-plan-wallet" aria-labelledby="tutor-plan-heading">
      <div className="tutor-plan-hero">
        <div className="tutor-plan-hero-glow" aria-hidden />
        <div className="tutor-plan-hero-inner">
          <div className="tutor-plan-hero-copy">
            <p className="tutor-plan-kicker">
              <span className="tutor-plan-kicker-icon" aria-hidden>
                ✦
              </span>
              Membership
            </p>
            <h2 className="tutor-plan-title" id="tutor-plan-heading">
              Your plan
            </h2>
            <p className="tutor-plan-lead">
              {hasBenefits
                ? `${activePlans.length} active benefit${activePlans.length === 1 ? "" : "s"} on your account`
                : "Complete your profile for free search visibility — upgrade when you are ready"}
            </p>
          </div>
          {corePlan ? (
            <span className="tutor-plan-status-pill">Active</span>
          ) : hasBenefits ? (
            <span className="tutor-plan-status-pill">Add-ons active</span>
          ) : (
            <span className="tutor-plan-status-pill tutor-plan-status-pill--draft">Free tier</span>
          )}
        </div>
      </div>

      <div className="tutor-plan-body">
        {hasBenefits ? (
          <ul className="tutor-plan-list">
            {activePlans.map((sub) => {
              const name = getPlan(sub.plan as never)?.name || sub.plan;
              const visual = planVisual(sub.plan);
              const listingHref =
                sub.plan === "AD_BOOST" || sub.plan === "HIGHLIGHTED_AD"
                  ? "/dashboard/tutor?tab=profile#teaching-listings"
                  : null;
              return (
                <li key={sub.id} className="tutor-plan-item">
                  <span className="tutor-plan-item-icon" aria-hidden>
                    {visual.icon}
                  </span>
                  <div className="tutor-plan-item-copy">
                    <span className="tutor-plan-item-eyebrow">{visual.eyebrow}</span>
                    <strong className="tutor-plan-item-name">{name}</strong>
                    <span className="tutor-plan-item-renewal">
                      Access until {formatRenewal(sub.currentPeriodEnd)}
                    </span>
                  </div>
                  <div className="tutor-plan-item-actions">
                    {listingHref ? (
                      <Link className="tutor-plan-item-slip" href={listingHref}>
                        Open listing
                      </Link>
                    ) : null}
                    <Link className="tutor-plan-item-slip" href={`/receipt/${sub.id}`}>
                      View slip
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="tutor-plan-empty">
            {launchActive ? (
              <>
                <p className="tutor-plan-offer-label">{TUTOR_PRO_LAUNCH_OFFER_LABEL}</p>
                <p>
                  Free listing includes {BUSINESS.tutorFreeActiveListings} live Teaching Profile.
                  Activate Tutor Pro free until {untilLabel}: up to{" "}
                  {BUSINESS.tutorProActiveListings} live profiles, ranking, and unlimited enquiry
                  reveals. Listing Boost stays a separate paid add-on and does not add capacity.
                </p>
              </>
            ) : (
              <p>
                Complete your profile to appear in search for free with{" "}
                {BUSINESS.tutorFreeActiveListings} Teaching Profile. Tutor Pro unlocks
                relevance-first ranking, unlimited student contacts, and up to{" "}
                {BUSINESS.tutorProActiveListings} Teaching Profiles.
              </p>
            )}
          </div>
        )}

        {pendingSubs.length > 0 ? (
          <div className="tutor-plan-pending">
            <p>
              {pendingSubs.length} unfinished checkout
              {pendingSubs.length === 1 ? "" : "s"}. If Safepay already charged you, confirm below.
            </p>
            <div className="tutor-plan-pending-actions">
              {pendingSubs
                .filter((s) => s.stripeSubscriptionId?.startsWith("track_"))
                .map((s) => (
                  <a
                    key={s.id}
                    className="btn btn-sm"
                    href={`/api/safepay/complete?tracker=${encodeURIComponent(s.stripeSubscriptionId!)}&plan=${encodeURIComponent(s.plan)}`}
                  >
                    Confirm {getPlan(s.plan as never)?.name || s.plan}
                  </a>
                ))}
            </div>
          </div>
        ) : null}

        {!corePlan ? (
          <div className="tutor-plan-cta">
            {launchActive ? (
              <SubscribeButton
                plan="TUTOR_BASIC"
                planLabel="Tutor Pro"
                currency={currency}
                label="Activate Tutor Pro free"
                complimentary
                paidCheckoutLive={paidCheckoutLive}
              />
            ) : (
              <Link href="/pricing?plan=TUTOR_BASIC" className="btn btn-block">
                View Tutor Pro plans
              </Link>
            )}
          </div>
        ) : null}

        <div className="tutor-plan-foot">
          <Link href="/dashboard/tutor/plan">Plan details</Link>
          <span aria-hidden>·</span>
          <Link href="/pricing">Tutor add-ons</Link>
        </div>

        {!corePlan ? <RecoverPaymentForm /> : null}
      </div>
    </section>
  );
}
