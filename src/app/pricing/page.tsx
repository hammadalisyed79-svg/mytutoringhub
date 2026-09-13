import { auth } from "@/lib/auth";
import Link from "next/link";
import { getLivePlans, getPlan } from "@/lib/plans";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { CheckoutNotice } from "@/components/CheckoutNotice";
import { PaymentsComingSoonBanner } from "@/components/PaymentsComingSoonBanner";
import { PricingPlansClient } from "@/components/PricingPlansClient";
import { prisma } from "@/lib/prisma";
import { STUDENT_PASS_PAPERS_LINE, STUDENT_FREE_CONTACTS_LINE } from "@/lib/marketing-copy";
import { ResendVerificationButton } from "@/components/ResendVerificationButton";
import { pageMetadata } from "@/lib/seo";
import { isPaidCheckoutLive } from "@/lib/payments-status";
import { getHubPointsBalanceSafe } from "@/lib/hub-points";
import { reconcileUserSafepayPayments } from "@/lib/safepay-complete";
import { BUSINESS } from "@/lib/business-rules";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Plans & Pricing – Student Pass, Student Pro & Tutor Subscriptions",
  description: `${STUDENT_FREE_CONTACTS_LINE} ${STUDENT_PASS_PAPERS_LINE} Tutors list free with 1 active Teaching Profile; Tutor Pro adds up to 10. No lesson commission.`,
  path: "/pricing",
});

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{
    checkout?: string;
    state?: string;
    verify?: string;
    plan?: string;
    subjectProfileId?: string;
  }>;
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
  const deepPlan = sp.plan ? getPlan(sp.plan) : null;
  const defaultAudience: "student" | "tutor" | undefined =
    role === "TUTOR"
      ? "tutor"
      : role === "STUDENT"
        ? "student"
        : deepPlan?.audience === "tutor" ||
            deepPlan?.audience === "student"
          ? deepPlan.audience
          : undefined;

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
            <p className="eyebrow">Simple plans</p>
            <h1 className="page-title">Plans &amp; pricing</h1>
            <p className="section-lead">
              Start free. Upgrade only when you need more contacts, more live Teaching Profiles, or
              growth tools. Prices shown in <strong>{currency}</strong>. We never take a cut of
              lesson fees.
            </p>
            <ul className="pricing-hero-bullets">
              <li>
                <strong>Students:</strong> {BUSINESS.studentFreeContactsPerMonth} free contacts/month —
                Pass unlocks unlimited messaging
              </li>
              <li>
                <strong>Tutors:</strong> {BUSINESS.tutorFreeActiveListings} live profile free · Extra
                Active adds +1 · Tutor Pro up to {BUSINESS.tutorProActiveListings}
              </li>
              <li>
                <Link href="/free-vs-paid">Compare free vs paid</Link> if you want the full feature
                table
              </li>
            </ul>
          </div>
          <ol className="checkout-steps" aria-label="How checkout works">
            <li className={session?.user ? "is-done" : "is-current"}>1. Create a free account</li>
            <li className={session?.user ? "is-current" : ""}>2. Choose a plan</li>
            <li>{paidCheckoutLive ? "3. Pay securely on Safepay" : "3. Confirm activation"}</li>
          </ol>
        </div>

        {!paidCheckoutLive && <PaymentsComingSoonBanner />}

        <div className="checkout-trust-bar">
          {paidCheckoutLive ? (
            <>
              <span>Encrypted checkout</span>
              <span>Email confirmation</span>
              <span>Works worldwide</span>
              <span>No cart — one-step checkout</span>
            </>
          ) : (
            <>
              <span>Free Teaching Profiles</span>
              <span>Launch offer on Tutor Pro</span>
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
              ? "Join free, then pay from the plan you pick. Signed-in accounts start checkout here — no trip back to register."
              : "Join free first. The Tutor Pro Launch offer activates without payment; paid plans can be confirmed by email until card checkout is live."}
          </p>
        )}

        <PricingPlansClient
          corePlans={corePlans}
          addOns={addOns}
          currency={currency}
          signedIn={Boolean(session?.user)}
          paidCheckoutLive={paidCheckoutLive}
          hubPointsBalance={hubPointsBalance}
          subjectProfileId={sp.subjectProfileId}
          defaultAudience={defaultAudience}
        />
      </div>
    </div>
  );
}
