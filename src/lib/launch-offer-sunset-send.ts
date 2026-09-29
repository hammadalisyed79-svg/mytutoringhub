/**
 * Admin-triggered Launch offer sunset email (tutor_launch_offer_sunset).
 * Targets verified tutors while Tutor Pro promo is still active.
 */
import { prisma } from "@/lib/prisma";
import { emailConfigured, sendEmail, tutorLaunchOfferSunsetEmailHtml } from "@/lib/email";
import { NURTURE_SEQUENCES, claimEmailEvent, releaseEmailEvent } from "@/lib/email-nurture";
import { formatPromoUntil, getLivePlan } from "@/lib/plans";
import { hasAnyActivePlan } from "@/lib/subscription";
import { getPublicAppUrl } from "@/lib/payments-status";
import { TUTOR_PRO_LAUNCH_OFFER_UNTIL } from "@/lib/marketing-copy";

export type LaunchOfferSunsetPreview = {
  promoActive: boolean;
  untilLabel: string;
  eligibleCount: number;
  withTutorPro: number;
  withoutTutorPro: number;
  email: { subject: string; cta: string; bodyPreview: string };
};

export type LaunchOfferSunsetSummary = {
  ok: true;
  eligibleAtExecution: number;
  sent: number;
  alreadyReceived: number;
  becameIneligible: number;
  failed: number;
  promoInactive: boolean;
};

const appUrl = () => getPublicAppUrl() || "https://www.mytutoringhub.com";

async function loadEligibleTutors(limit = 500) {
  return prisma.user.findMany({
    where: {
      role: "TUTOR",
      suspended: false,
      emailVerified: { not: null },
    },
    select: { id: true, name: true, email: true },
    take: limit,
    orderBy: { createdAt: "desc" },
  });
}

export async function getLaunchOfferSunsetPreview(): Promise<LaunchOfferSunsetPreview> {
  const plan = await getLivePlan("TUTOR_BASIC");
  const untilLabel =
    formatPromoUntil(plan?.promoEndsAt || null) || TUTOR_PRO_LAUNCH_OFFER_UNTIL;
  const tutors = plan?.isPromoActive ? await loadEligibleTutors() : [];
  let withTutorPro = 0;
  for (const t of tutors) {
    if (await hasAnyActivePlan(t.id, ["TUTOR_BASIC"])) withTutorPro += 1;
  }
  return {
    promoActive: Boolean(plan?.isPromoActive),
    untilLabel,
    eligibleCount: tutors.length,
    withTutorPro,
    withoutTutorPro: Math.max(0, tutors.length - withTutorPro),
    email: {
      subject: `Launch offer ends ${untilLabel} — Tutor Pro`,
      cta: "Activate or view Tutor Pro",
      bodyPreview:
        "Reminds tutors the complimentary Tutor Pro window is ending; free listing (1 Teaching Profile) stays permanent.",
    },
  };
}

export async function sendLaunchOfferSunsetCampaign(): Promise<LaunchOfferSunsetSummary> {
  if (!emailConfigured()) {
    throw new Error(
      "Email is not configured. Add RESEND_API_KEY before sending the Launch offer sunset email.",
    );
  }

  const plan = await getLivePlan("TUTOR_BASIC");
  if (!plan?.isPromoActive) {
    return {
      ok: true,
      eligibleAtExecution: 0,
      sent: 0,
      alreadyReceived: 0,
      becameIneligible: 0,
      failed: 0,
      promoInactive: true,
    };
  }

  const untilLabel =
    formatPromoUntil(plan.promoEndsAt) || TUTOR_PRO_LAUNCH_OFFER_UNTIL;
  const tutors = await loadEligibleTutors();
  const eligibleAtExecution = tutors.length;
  let sent = 0;
  let alreadyReceived = 0;
  let becameIneligible = 0;
  let failed = 0;

  for (const user of tutors) {
    if (!user.email) {
      becameIneligible += 1;
      continue;
    }
    const claimed = await claimEmailEvent(user.id, NURTURE_SEQUENCES.TUTOR_LAUNCH_OFFER_SUNSET);
    if (!claimed) {
      alreadyReceived += 1;
      continue;
    }
    try {
      const hasComplimentaryPro = await hasAnyActivePlan(user.id, ["TUTOR_BASIC"]);
      await sendEmail({
        to: user.email,
        subject: hasComplimentaryPro
          ? `Your complimentary Tutor Pro ends ${untilLabel}`
          : `Launch offer ends ${untilLabel} — activate Tutor Pro free`,
        html: tutorLaunchOfferSunsetEmailHtml({
          name: user.name || "there",
          untilLabel,
          hasComplimentaryPro,
          pricingUrl: `${appUrl()}/pricing?plan=TUTOR_BASIC`,
          dashboardUrl: `${appUrl()}/dashboard/tutor`,
        }),
      });
      sent += 1;
    } catch (err) {
      await releaseEmailEvent(user.id, NURTURE_SEQUENCES.TUTOR_LAUNCH_OFFER_SUNSET);
      failed += 1;
      console.error("[launch-offer-sunset] send failed", user.id, err);
    }
  }

  return {
    ok: true,
    eligibleAtExecution,
    sent,
    alreadyReceived,
    becameIneligible,
    failed,
    promoInactive: false,
  };
}
