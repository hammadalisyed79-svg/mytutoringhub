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
            <h1 className="page-title">Plans &amp; pricing</h1>
            <p className="section-lead">
              Start free. Upgrade when you need more. Prices shown in <strong>{currency}</strong>.
              No commission on lesson fees.
            </p>
          </div>
        </div>

        {!paidCheckoutLive && <PaymentsComingSoonBanner />}

        <div className="checkout-trust-bar">
          {paidCheckoutLive ? (
            <>
              <span>Secure checkout with Safepay</span>
              <span>Email receipt</span>
              <span>No lesson commission</span>
            </>
          ) : (
            <>
              <span>Free Teaching Profiles</span>
              <span>Launch offer on Tutor Pro</span>
              <span>No lesson commission</span>
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
