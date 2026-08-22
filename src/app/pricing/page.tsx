import { auth } from "@/lib/auth";
import { formatPromoUntil, getLivePlans, getPlan } from "@/lib/plans";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { CheckoutNotice } from "@/components/CheckoutNotice";
import { PricingPlansClient } from "@/components/PricingPlansClient";
import { ValuePropStrip } from "@/components/ValuePropStrip";
import { prisma } from "@/lib/prisma";
import { VALUE_PROPOSITION, STUDENT_PASS_PAPERS_LINE } from "@/lib/marketing-copy";
import { ResendVerificationButton } from "@/components/ResendVerificationButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Plans & Pricing – Student Pass, Student Pro and Tutor Subscriptions",
  description:
    "Free students get 3 tutor contacts/month; Student Pass unlocks unlimited messaging. Student Pro adds AI. Free tutors with a complete profile appear in search; Tutor Basic adds priority, unlimited reveals, and ads. No lesson commission.",
  alternates: { canonical: "/pricing" },
};

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
  const corePlans = visible.filter((p) => !p.isAddOn);
  const addOns = visible.filter((p) => p.isAddOn);
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

  return (
    <div className="page checkout-page">
      <div className="container">
        <div className="checkout-hero">
          <div>
            <p className="eyebrow">Platform subscriptions</p>
            <h1 className="page-title">Plans & pricing</h1>
            <p className="section-lead">
              {VALUE_PROPOSITION} Prices shown in <strong>{currency}</strong>.{" "}
              {STUDENT_PASS_PAPERS_LINE} There is no shopping cart — choose a plan and pay on
              Safepay in one step.
            </p>
            <ValuePropStrip />
          </div>
          <ol className="checkout-steps" aria-label="Checkout steps">
            <li className={session?.user ? "is-done" : "is-current"}>1. Account</li>
            <li className={session?.user ? "is-current" : ""}>2. Choose plan</li>
            <li>3. Pay on Safepay</li>
          </ol>
        </div>

        {liveOffer && (
          <aside className="promo-banner">
            <strong>{liveOffer.promoLabel || "Limited offer"}</strong>
            <p>
              {liveOffer.promoNote ||
                `Tutor Basic is ${liveOffer.isComplimentary ? "complimentary" : "discounted"} until ${formatPromoUntil(liveOffer.promoEndsAt)}. Verified badge, highlight, and ad boost remain paid.`}
            </p>
          </aside>
        )}

        <div className="checkout-trust-bar">
          <span>256-bit encrypted checkout</span>
          <span>Email confirmation</span>
          <span>Works worldwide</span>
          <span>No cart — one-click plan checkout</span>
        </div>

        <CheckoutNotice
          checkout={sp.checkout}
          state={sp.state}
          planLabel={sp.plan ? getPlan(sp.plan)?.name || sp.plan : undefined}
        />

        {needsVerify && (
          <div className="panel checkout-verify">
            <p style={{ marginTop: 0 }}>
              {sp.verify === "sent"
                ? `We tried to send a confirmation to ${me?.email || "your email"} from admin@mytutoringhub.com.`
                : "Verify your email to unlock messaging and student requests. Student Pro unlocks the AI study assistant."}{" "}
              Check inbox, junk, and promotions. Hotmail can delay mail by several minutes.
            </p>
            <ResendVerificationButton email={me?.email || undefined} />
          </div>
        )}

        {!session?.user && (
          <p className="muted" style={{ marginBottom: "1.25rem" }}>
            Join free, then pay on Safepay from the plan you pick. Signed-in accounts never go back
            to register — checkout starts here.
          </p>
        )}

        <PricingPlansClient
          corePlans={corePlans}
          addOns={addOns}
          currency={currency}
          signedIn={Boolean(session?.user)}
        />
      </div>
    </div>
  );
}
