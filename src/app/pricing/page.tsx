import { auth } from "@/lib/auth";
import Link from "next/link";
import { formatPromoUntil, getLivePlans, getPlan } from "@/lib/plans";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { CheckoutNotice } from "@/components/CheckoutNotice";
import { PaymentsComingSoonBanner } from "@/components/PaymentsComingSoonBanner";
import { PricingPlansClient } from "@/components/PricingPlansClient";
import { ValuePropStrip } from "@/components/ValuePropStrip";
import { prisma } from "@/lib/prisma";
import { VALUE_PROPOSITION, STUDENT_PASS_PAPERS_LINE, STUDENT_FREE_CONTACTS_LINE } from "@/lib/marketing-copy";
import { ResendVerificationButton } from "@/components/ResendVerificationButton";
import { pageMetadata } from "@/lib/seo";
import { isPaidCheckoutLive } from "@/lib/payments-status";
import { getHubPointsBalanceSafe } from "@/lib/hub-points";
import { reconcileUserSafepayPayments } from "@/lib/safepay-complete";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Plans & Pricing – Student Pass, Student Pro & Tutor Subscriptions",
  description: `${STUDENT_FREE_CONTACTS_LINE} ${STUDENT_PASS_PAPERS_LINE} Tutors list free; Tutor Pro adds priority. No lesson commission.`,
  path: "/pricing",
});

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; state?: string; verify?: string; plan?: string }>;
}) {
  const session = await auth();
  const role = session?.user?.role;
  const currency = await getVisitorCurrency();
  const allPlans = await getLivePlans();
  const sp = await searchParams;
  const visible = allPlans.filter((p) => {
    if (!role || role === "ADMIN") return true;
    if (role === "STUDENT") return p.audience === "student";
    return p.audience === "tutor";
  });
  const { PUBLIC_ADDON_PLAN_IDS } = await import("@/lib/plans");
  const corePlans = visible.filter((p) => !p.isAddOn);
  const addOns = visible.filter(
    (p) => p.isAddOn && (PUBLIC_ADDON_PLAN_IDS as readonly string[]).includes(p.id),
  );
  const liveOffer = allPlans.find((p) => p.id === "TUTOR_BASIC" && p.isPromoActive);

  const me = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { emailVerified: true, email: true },
      })
    : null;
  const needsVerify =
    session?.user &&
    session.user.role !== "ADMIN" &&
    (sp.verify === "sent" || !me?.emailVerified);
  const paidCheckoutLive = isPaidCheckoutLive();

  if (session?.user?.id) {
    await reconcileUserSafepayPayments(session.user.id).catch(() => undefined);
  }

  const hubPointsBalance = session?.user?.id
    ? await getHubPointsBalanceSafe(session.user.id)
    : 0;

  return (
    <div className="page checkout-page">
      <div className="container">
        <div className="checkout-hero">
          <div>
            <p className="eyebrow">Platform subscriptions</p>
            <h1 className="page-title">Plans & pricing</h1>
            <p className="section-lead">
              {VALUE_PROPOSITION} Prices shown in <strong>{currency}</strong>.{" "}
              {STUDENT_PASS_PAPERS_LINE}{" "}
              {paidCheckoutLive
                ? "There is no shopping cart — choose a plan and pay on Safepay in one step."
                : "Card checkout is launching soon — free and complimentary plans work now; paid plans activate within 24 hours after payment."}
            </p>
            <ValuePropStrip />
            <p className="muted" style={{ marginTop: "0.75rem" }}>
              Not sure what&apos;s included?{" "}
              <Link href="/free-vs-paid">Read the free vs paid guide</Link> before you choose a
              plan.
            </p>
          </div>
          <ol className="checkout-steps" aria-label="Checkout steps">
            <li className={session?.user ? "is-done" : "is-current"}>1. Account</li>
            <li className={session?.user ? "is-current" : ""}>2. Choose plan</li>
            <li>{paidCheckoutLive ? "3. Pay on Safepay" : "3. Confirm activation"}</li>
          </ol>
        </div>

        {!paidCheckoutLive && <PaymentsComingSoonBanner />}

        {liveOffer && (
          <aside className="promo-banner">
            <strong>{liveOffer.promoLabel || "Limited offer"}</strong>
            <p>
              {liveOffer.promoNote ||
                `Tutor Pro is ${liveOffer.isComplimentary ? "complimentary" : "discounted"} until ${formatPromoUntil(liveOffer.promoEndsAt)}. Listing Boost and Priority Verification Review remain optional paid products.`}
            </p>
          </aside>
        )}

        <div className="checkout-trust-bar">
          {paidCheckoutLive ? (
            <>
              <span>256-bit encrypted checkout</span>
              <span>Email confirmation</span>
              <span>Works worldwide</span>
              <span>No cart — one-click plan checkout</span>
            </>
          ) : (
            <>
              <span>Free Teaching Profiles</span>
              <span>Complimentary Tutor Pro</span>
              <span>Bank transfer accepted</span>
              <span>Plans activated within 24h</span>
            </>
          )}
        </div>

        <CheckoutNotice
          checkout={sp.checkout}
          state={sp.state}
          planLabel={sp.plan ? getPlan(sp.plan)?.name || sp.plan : undefined}
        />

        {needsVerify && (
          <div className="panel checkout-verify">
            <p className="muted checkout-verify-lead">
              {sp.verify === "sent"
                ? `We sent a confirmation link to ${me?.email || "your email"}.`
                : "Verify your email to unlock messaging and student requests. Student Pro unlocks the AI study assistant."}{" "}
              Check inbox, junk, and promotions — some providers delay mail by a few minutes.
            </p>
            <ResendVerificationButton email={me?.email || undefined} />
          </div>
        )}

        {!session?.user && (
          <p className="muted" style={{ marginBottom: "1.25rem" }}>
            {paidCheckoutLive
              ? "Join free, then pay on Safepay from the plan you pick. Signed-in accounts never go back to register — checkout starts here."
              : "Join free first. Complimentary Tutor Pro activates without payment; other paid plans — email us until card checkout is live."}
          </p>
        )}

        <PricingPlansClient
          corePlans={corePlans}
          addOns={addOns}
          currency={currency}
          signedIn={Boolean(session?.user)}
          paidCheckoutLive={paidCheckoutLive}
          hubPointsBalance={hubPointsBalance}
        />
      </div>
    </div>
  );
}
