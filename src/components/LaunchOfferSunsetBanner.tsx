import Link from "next/link";
import { getLivePlan, formatPromoUntil } from "@/lib/plans";
import { TUTOR_PRO_LAUNCH_OFFER_LABEL } from "@/lib/marketing-copy";

/** Sitewide urgency banner while Tutor Pro Launch offer is still active. */
export async function LaunchOfferSunsetBanner() {
  const plan = await getLivePlan("TUTOR_BASIC");
  if (!plan?.isPromoActive || !plan.promoEndsAt) return null;

  const until = formatPromoUntil(plan.promoEndsAt) || TUTOR_PRO_LAUNCH_OFFER_LABEL;
  const msLeft = plan.promoEndsAt.getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  const urgent = daysLeft <= 2;

  return (
    <div
      className={`site-banner site-banner--launch${urgent ? " site-banner--urgent" : ""}`}
      role="status"
    >
      <div className="container">
        {plan.isComplimentary ? (
          <>
            <strong>{TUTOR_PRO_LAUNCH_OFFER_LABEL}</strong>
            {urgent ? " ends " : " — Tutor Pro free until "}
            <strong>{until}</strong>
            {urgent ? ". " : ". "}
            After that, list price applies. Free listing (1 Teaching Profile) stays permanent.{" "}
            <Link href="/pricing?plan=TUTOR_BASIC">
              {urgent ? "Activate Tutor Pro free now" : "View Tutor Pro"}
            </Link>
          </>
        ) : (
          <>
            <strong>{plan.promoLabel || TUTOR_PRO_LAUNCH_OFFER_LABEL}</strong> until{" "}
            <strong>{until}</strong>.{" "}
            <Link href="/pricing?plan=TUTOR_BASIC">View Tutor Pro</Link>
          </>
        )}
      </div>
    </div>
  );
}
