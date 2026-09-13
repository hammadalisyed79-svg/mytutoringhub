import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StudyAssistantChat } from "@/components/StudyAssistantChat";
import { ContextualUpgradePanel } from "@/components/ContextualUpgradePanel";
import { getSiteSettings } from "@/lib/site-settings";
import { canUseStudyAssistant } from "@/lib/subscription";
import type { Role } from "@/lib/types";
import { privateMetadata } from "@/lib/seo";
import { getLivePlan } from "@/lib/plans";
import { formatPlanPrice } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { isPaidCheckoutLive } from "@/lib/payments-status";
import { loginUrlWithNext } from "@/lib/safe-return-url";

export const metadata = privateMetadata(
  "Study assistant",
  "AI study coach for Student Pro — explanations and practice on My Tutoring Hub.",
);

export default async function AssistantPage() {
  const session = await auth();
  if (!session?.user) redirect(loginUrlWithNext("/assistant"));

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true, role: true, suspended: true },
  });
  if (user?.suspended) redirect("/dashboard");
  if (session.user.role !== "ADMIN" && !user?.emailVerified) {
    redirect("/dashboard?verify=1");
  }

  const settings = await getSiteSettings();
  if (settings.disableAiAssistant && session.user.role !== "ADMIN") {
    return (
      <div className="page">
        <div className="container narrow-prose">
          <h1 className="page-title">Study assistant</h1>
          <p className="muted">The study assistant is temporarily unavailable.</p>
        </div>
      </div>
    );
  }

  if (!(await canUseStudyAssistant(session.user.id, session.user.role as Role))) {
    const currency = await getVisitorCurrency();
    const pro = await getLivePlan("STUDENT_PRO");
    const proMonthly = formatPlanPrice(pro?.listPricePkr ?? 3499, currency);
    const proAnnual = formatPlanPrice(pro?.annualPricePkr ?? 33590, currency, "year");
    return (
      <div className="page">
        <div className="container narrow-prose">
          <h1 className="page-title">Study assistant</h1>
          <p className="section-lead">
            Free study tools (progress log and exam countdown) stay available without a paid plan.
          </p>
          <ContextualUpgradePanel
            title="Unlock AI Study Assistant with Student Pro"
            plan="STUDENT_PRO"
            planLabel="Student Pro"
            priceLabel={proMonthly}
            billingLabel="Billed monthly"
            annualOption={{ monthlyLabel: proMonthly, annualLabel: proAnnual }}
            benefits={[
              "AI Study Assistant",
              "Unlimited eligible Past Papers",
              "All Student Pass benefits (unlimited contacts + request ads)",
            ]}
            ctaLabel="Get Student Pro"
            maybeLaterHref="/study/progress"
            maybeLaterLabel="Use free study tools instead"
            currency={currency}
            paidCheckoutLive={isPaidCheckoutLive()}
            returnUrl="/assistant"
            trigger="ai_feature"
            sourcePage="assistant"
          />
          <p className="muted" style={{ marginTop: "1rem" }}>
            <Link href="/study/progress">Study log (free)</Link>
            {" · "}
            <Link href="/study/countdown">Exam countdown (free)</Link>
            {" · "}
            <Link href="/pricing?plan=STUDENT_PRO">Compare all plans</Link>
          </p>
        </div>
      </div>
    );
  }

  const configured = Boolean(process.env.OPENAI_API_KEY);

  return (
    <div className="page">
      <div className="container narrow-prose">
        <h1 className="page-title">Study assistant</h1>
        <p className="section-lead">
          Included with Student Pro — explanations, practice questions, and plans. This is an AI
          coach, not a live tutor. For human tutoring, use Find tutors.
        </p>
        <StudyAssistantChat initiallyConfigured={configured} />
      </div>
    </div>
  );
}
