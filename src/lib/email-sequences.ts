import { prisma } from "@/lib/prisma";
import {
  emailConfigured,
  postVerifyStudentEmailHtml,
  postVerifyTutorEmailHtml,
  sendEmail,
  studentUpgradeNudgeEmailHtml,
  tutorPicksEmailHtml,
  verificationReminderEmailHtml,
} from "@/lib/email";
import { runHubPointsMaintenance } from "@/lib/hub-points";
import { createEmailVerificationLink } from "@/lib/email-verification";
import { STUDENT_FREE_CONTACT_LIMIT, canPerformAction } from "@/lib/plan-limits";
import { hasStudentMessagingPass } from "@/lib/subscription";
import { formatHourly } from "@/lib/currency";
import { publicListedTutorWhere, filterCanonicallyPublicTutors } from "@/lib/tutor-public-eligibility";

export const EMAIL_SEQUENCES = {
  POST_VERIFY: "post_verify",
  TUTOR_PICKS: "tutor_picks",
  UPGRADE_NUDGE: "upgrade_nudge",
  VERIFY_REMINDER: "verify_reminder",
} as const;

type SequenceKey = (typeof EMAIL_SEQUENCES)[keyof typeof EMAIL_SEQUENCES];

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "https://www.mytutoringhub.com";

async function claimSequence(userId: string, sequence: SequenceKey): Promise<boolean> {
  try {
    await prisma.emailSequenceEvent.create({ data: { userId, sequence } });
    return true;
  } catch {
    return false;
  }
}

async function releaseSequence(userId: string, sequence: SequenceKey) {
  await prisma.emailSequenceEvent
    .delete({ where: { userId_sequence: { userId, sequence } } })
    .catch(() => undefined);
}

async function fetchSuggestedTutors(limit = 3) {
  const rows = await prisma.tutorProfile.findMany({
    where: publicListedTutorWhere(),
    orderBy: [{ planTier: "desc" }, { verified: "desc" }, { highlighted: "desc" }],
    take: Math.max(limit * 3, limit),
    select: {
      id: true,
      headline: true,
      subjects: true,
      location: true,
      country: true,
      hourlyRate: true,
      verified: true,
      photoUrl: true,
      bio: true,
      online: true,
      inPerson: true,
      qualifications: true,
      active: true,
      forceActive: true,
      user: { select: { name: true, emailVerified: true, suspended: true } },
    },
  });
  return filterCanonicallyPublicTutors(rows).slice(0, limit);
}

function tutorPickListHtml(
  tutors: Awaited<ReturnType<typeof fetchSuggestedTutors>>,
  currency = "PKR",
) {
  return tutors
    .map((t) => {
      const subjects = (t.subjects || "").split(/[,;/|]/)[0]?.trim() || "Tutoring";
      const rate = formatHourly(t.hourlyRate, currency as never);
      const badge = t.verified ? " · Verified" : "";
      return `<li style="margin:0 0 14px;padding:14px 16px;background:#f6f1e8;border-radius:10px;list-style:none">
<strong>${t.user.name}</strong>${badge}<br/>
<span style="color:#486581;font-size:14px">${subjects} · ${t.location || "Online"} · ${rate}</span><br/>
<a href="${appUrl()}/tutors/${t.id}" style="color:#0d5f52;font-weight:600;font-size:14px">View profile →</a>
</li>`;
    })
    .join("");
}

export async function sendPostVerifyEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, emailVerified: true },
  });
  if (!user?.emailVerified || !user.email) return { sent: false, reason: "not_verified" as const };

  const claimed = await claimSequence(userId, EMAIL_SEQUENCES.POST_VERIFY);
  if (!claimed) return { sent: false, reason: "already_sent" as const };

  try {
    const html =
      user.role === "TUTOR"
        ? postVerifyTutorEmailHtml({
            name: user.name,
            dashboardUrl: `${appUrl()}/dashboard/tutor`,
          })
        : postVerifyStudentEmailHtml({
            name: user.name,
            searchUrl: `${appUrl()}/search`,
          });

    await sendEmail({
      to: user.email,
      subject:
        user.role === "TUTOR"
          ? "Email confirmed — complete your tutor profile"
          : "Email confirmed — find your tutor",
      html,
    });
    return { sent: true as const };
  } catch (err) {
    await releaseSequence(userId, EMAIL_SEQUENCES.POST_VERIFY);
    throw err;
  }
}

export async function sendTutorPicksEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, emailVerified: true, suspended: true },
  });
  if (!user?.emailVerified || user.role !== "STUDENT" || user.suspended || !user.email) {
    return { sent: false, reason: "ineligible" as const };
  }

  const claimed = await claimSequence(userId, EMAIL_SEQUENCES.TUTOR_PICKS);
  if (!claimed) return { sent: false, reason: "already_sent" as const };

  try {
    const tutors = await fetchSuggestedTutors(3);
    if (tutors.length === 0) {
      await releaseSequence(userId, EMAIL_SEQUENCES.TUTOR_PICKS);
      return { sent: false, reason: "no_tutors" as const };
    }

    await sendEmail({
      to: user.email,
      subject: `${tutors.length} tutors to get you started · My Tutoring Hub`,
      html: tutorPicksEmailHtml({
        name: user.name,
        tutorsHtml: tutorPickListHtml(tutors),
        searchUrl: `${appUrl()}/search`,
      }),
    });
    return { sent: true as const };
  } catch (err) {
    await releaseSequence(userId, EMAIL_SEQUENCES.TUTOR_PICKS);
    throw err;
  }
}

export async function sendUpgradeNudgeEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, emailVerified: true, suspended: true },
  });
  if (!user?.emailVerified || user.role !== "STUDENT" || user.suspended || !user.email) {
    return { sent: false, reason: "ineligible" as const };
  }

  if (await hasStudentMessagingPass(userId)) {
    return { sent: false, reason: "has_pass" as const };
  }

  const claimed = await claimSequence(userId, EMAIL_SEQUENCES.UPGRADE_NUDGE);
  if (!claimed) return { sent: false, reason: "already_sent" as const };

  try {
    const check = await canPerformAction(userId, "tutor_contact");
    const limit =
      check.limit === -1 ? STUDENT_FREE_CONTACT_LIMIT : Math.max(0, check.limit - check.used);

    await sendEmail({
      to: user.email,
      subject: "Unlock unlimited tutor messaging · Student Pass",
      html: studentUpgradeNudgeEmailHtml({
        name: user.name,
        pricingUrl: `${appUrl()}/pricing?plan=STUDENT_PASS`,
        contactsRemaining: limit,
      }),
    });
    return { sent: true as const };
  } catch (err) {
    await releaseSequence(userId, EMAIL_SEQUENCES.UPGRADE_NUDGE);
    throw err;
  }
}

/** Immediate sequence after email verification: welcome + tutor picks (students). */
export async function runPostVerifySequence(userId: string) {
  if (!emailConfigured()) {
    console.info("[email-sequence] skipped — email not configured");
    return { postVerify: false, tutorPicks: false };
  }

  const results = { postVerify: false, tutorPicks: false };
  try {
    const welcome = await sendPostVerifyEmail(userId);
    results.postVerify = welcome.sent;
  } catch (err) {
    console.error("[email-sequence] post_verify failed", userId, err);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === "STUDENT") {
    try {
      const picks = await sendTutorPicksEmail(userId);
      results.tutorPicks = picks.sent;
    } catch (err) {
      console.error("[email-sequence] tutor_picks failed", userId, err);
    }
  }

  return results;
}

/** Cron: backup tutor picks + delayed upgrade nudges + verify reminders + nurture drips + Hub Points maintenance. */
export async function runOnboardingDigest() {
  if (!emailConfigured()) {
    const [points, nurture] = await Promise.all([
      runHubPointsMaintenance().catch(() => ({ expired: 0, warnings: 0 })),
      import("@/lib/email-nurture").then((m) => m.runNurtureDigest()),
    ]);
    return {
      ok: true,
      skipped: true,
      sent: { tutorPicks: 0, upgradeNudge: 0, verifyReminder: 0 },
      nurture: nurture.sent,
      hubPoints: points,
    };
  }

  const now = Date.now();
  const day = 86400000;
  const picksSince = new Date(now - 2 * day);
  const picksUntil = new Date(now - 12 * 3600000);
  const nudgeSince = new Date(now - 4 * day);
  const nudgeUntil = new Date(now - 2 * day);
  const verifySince = new Date(now - 2 * day);
  const verifyUntil = new Date(now - 1 * day);

  const [pickCandidates, nudgeCandidates, verifyCandidates] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "STUDENT",
        suspended: false,
        emailVerified: { gte: picksSince, lte: picksUntil },
        emailSequenceEvents: { none: { sequence: EMAIL_SEQUENCES.TUTOR_PICKS } },
      },
      select: { id: true },
      take: 80,
    }),
    prisma.user.findMany({
      where: {
        role: "STUDENT",
        suspended: false,
        emailVerified: { gte: nudgeSince, lte: nudgeUntil },
        emailSequenceEvents: { none: { sequence: EMAIL_SEQUENCES.UPGRADE_NUDGE } },
        subscriptions: {
          none: {
            plan: { in: ["STUDENT_PASS", "STUDENT_PRO"] },
            status: { in: ["ACTIVE", "TRIALING"] },
          },
        },
      },
      select: { id: true },
      take: 80,
    }),
    prisma.user.findMany({
      where: {
        suspended: false,
        emailVerified: null,
        createdAt: { gte: verifySince, lte: verifyUntil },
        emailSequenceEvents: { none: { sequence: EMAIL_SEQUENCES.VERIFY_REMINDER } },
      },
      select: { id: true, name: true, email: true },
      take: 80,
    }),
  ]);

  let tutorPicks = 0;
  let upgradeNudge = 0;
  let verifyReminder = 0;

  for (const row of pickCandidates) {
    try {
      const result = await sendTutorPicksEmail(row.id);
      if (result.sent) tutorPicks += 1;
    } catch (err) {
      console.error("[digest/onboarding] tutor_picks", row.id, err);
    }
  }

  for (const row of nudgeCandidates) {
    try {
      const result = await sendUpgradeNudgeEmail(row.id);
      if (result.sent) upgradeNudge += 1;
    } catch (err) {
      console.error("[digest/onboarding] upgrade_nudge", row.id, err);
    }
  }

  for (const row of verifyCandidates) {
    if (!row.email) continue;
    const claimed = await claimSequence(row.id, EMAIL_SEQUENCES.VERIFY_REMINDER);
    if (!claimed) continue;
    try {
      const verifyUrl = await createEmailVerificationLink(row.id);
      if (!verifyUrl) continue;
      await sendEmail({
        to: row.email,
        subject: "Reminder: confirm your email · My Tutoring Hub",
        html: verificationReminderEmailHtml({
          name: row.name,
          verifyUrl,
        }),
      });
      verifyReminder += 1;
    } catch (err) {
      await releaseSequence(row.id, EMAIL_SEQUENCES.VERIFY_REMINDER);
      console.error("[digest/onboarding] verify_reminder", row.id, err);
    }
  }

  const hubPoints = await runHubPointsMaintenance().catch(() => ({ expired: 0, warnings: 0 }));
  const { runNurtureDigest } = await import("@/lib/email-nurture");
  const nurture = await runNurtureDigest();

  return {
    ok: true,
    sent: { tutorPicks, upgradeNudge, verifyReminder },
    nurture: nurture.sent,
    candidates: {
      tutorPicks: pickCandidates.length,
      upgradeNudge: nudgeCandidates.length,
      verifyReminder: verifyCandidates.length,
    },
    hubPoints,
  };
}
