import { prisma } from "@/lib/prisma";
import {
  emailConfigured,
  recommendationApprovedEmailHtml,
  recommendationRejectedEmailHtml,
  recommendationSubmittedEmailHtml,
  reviewPublishedEmailHtml,
  sendEmail,
  studentBrowseNudgeEmailHtml,
  studentPostAdNudgeEmailHtml,
  studentReferralNudgeEmailHtml,
  tutorPlanNudgeEmailHtml,
  tutorProfileIncompleteEmailHtml,
  tutorProfileLiveEmailHtml,
  tutorProfileNeverStartedEmailHtml,
  tutorVerificationApprovedEmailHtml,
  tutorVerifyNudgeEmailHtml,
  verificationReminderEmailHtml,
} from "@/lib/email";
import {
  getTutorProfileCompletion,
  isTutorProfileComplete,
  isTutorProfileStarted,
} from "@/lib/tutor-profile-completion";
import { trustBadgeMeta } from "@/lib/tutor-badges";
import { hasAnyActivePlan } from "@/lib/subscription";

export const NURTURE_SEQUENCES = {
  TUTOR_PROFILE_R1: "tutor_profile_r1",
  TUTOR_PROFILE_R2: "tutor_profile_r2",
  TUTOR_PROFILE_R3: "tutor_profile_r3",
  TUTOR_PROFILE_R4: "tutor_profile_r4",
  TUTOR_PROFILE_NEVER_STARTED: "tutor_profile_never_started",
  TUTOR_PROFILE_LIVE: "tutor_profile_live",
  TUTOR_PLAN_NUDGE: "tutor_plan_nudge",
  TUTOR_VERIFY_NUDGE: "tutor_verify_nudge",
  STUDENT_BROWSE_R1: "student_browse_r1",
  STUDENT_BROWSE_R2: "student_browse_r2",
  STUDENT_POST_AD_R1: "student_post_ad_r1",
  STUDENT_POST_AD_R2: "student_post_ad_r2",
  STUDENT_REFERRAL_NUDGE: "student_referral_nudge",
  VERIFY_REMINDER_7: "verify_reminder_7",
} as const;

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "https://www.mytutoringhub.com";

export async function claimEmailEvent(userId: string, sequence: string): Promise<boolean> {
  try {
    await prisma.emailSequenceEvent.create({ data: { userId, sequence } });
    return true;
  } catch {
    return false;
  }
}

async function releaseEmailEvent(userId: string, sequence: string) {
  await prisma.emailSequenceEvent
    .delete({ where: { userId_sequence: { userId, sequence } } })
    .catch(() => undefined);
}

function tutorCompletionInput(user: { name: string }, profile: {
  photoUrl: string | null;
  headline: string | null;
  bio: string;
  country: string | null;
  location: string;
  subjects: string;
  hourlyRate: number;
  online: boolean;
  inPerson: boolean;
  qualifications: string | null;
}) {
  return getTutorProfileCompletion({
    name: user.name,
    photoUrl: profile.photoUrl,
    headline: profile.headline,
    bio: profile.bio,
    country: profile.country,
    location: profile.location,
    subjects: profile.subjects,
    hourlyRate: profile.hourlyRate,
    online: profile.online,
    inPerson: profile.inPerson,
    qualifications: profile.qualifications,
  });
}

export async function sendTutorProfileReminderEmail(userId: string, step: 1 | 2 | 3 | 4) {
  const sequence = {
    1: NURTURE_SEQUENCES.TUTOR_PROFILE_R1,
    2: NURTURE_SEQUENCES.TUTOR_PROFILE_R2,
    3: NURTURE_SEQUENCES.TUTOR_PROFILE_R3,
    4: NURTURE_SEQUENCES.TUTOR_PROFILE_R4,
  }[step];

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      suspended: true,
      emailVerified: true,
      tutorProfile: true,
    },
  });
  if (!user?.email || !user.emailVerified || user.role !== "TUTOR" || user.suspended || !user.tutorProfile) {
    return { sent: false, reason: "ineligible" as const };
  }
  if (!isTutorProfileStarted(user.tutorProfile)) {
    return { sent: false, reason: "not_started" as const };
  }

  const completion = tutorCompletionInput(user, user.tutorProfile);
  if (completion.complete) return { sent: false, reason: "complete" as const };

  const claimed = await claimEmailEvent(userId, sequence);
  if (!claimed) return { sent: false, reason: "already_sent" as const };

  try {
    await sendEmail({
      to: user.email,
      subject: `Complete your My Tutoring Hub tutor profile (${completion.requiredDone}/${completion.requiredTotal})`,
      html: tutorProfileIncompleteEmailHtml({
        name: user.name,
        missing: completion.missingRequired,
        requiredDone: completion.requiredDone,
        requiredTotal: completion.requiredTotal,
        step,
        dashboardUrl: `${appUrl()}/dashboard/tutor?tab=profile`,
      }),
    });
    return { sent: true as const };
  } catch (err) {
    await releaseEmailEvent(userId, sequence);
    throw err;
  }
}

export async function sendTutorProfileNeverStartedEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, suspended: true, emailVerified: true, tutorProfile: true },
  });
  if (!user?.email || !user.emailVerified || user.role !== "TUTOR" || user.suspended || !user.tutorProfile) {
    return { sent: false, reason: "ineligible" as const };
  }
  if (isTutorProfileStarted(user.tutorProfile)) {
    return { sent: false, reason: "already_started" as const };
  }

  const claimed = await claimEmailEvent(userId, NURTURE_SEQUENCES.TUTOR_PROFILE_NEVER_STARTED);
  if (!claimed) return { sent: false, reason: "already_sent" as const };

  try {
    await sendEmail({
      to: user.email,
      subject: "Start your tutor profile · My Tutoring Hub",
      html: tutorProfileNeverStartedEmailHtml({
        name: user.name,
        dashboardUrl: `${appUrl()}/dashboard/tutor`,
      }),
    });
    return { sent: true as const };
  } catch (err) {
    await releaseEmailEvent(userId, NURTURE_SEQUENCES.TUTOR_PROFILE_NEVER_STARTED);
    throw err;
  }
}

export async function sendTutorProfileLiveEmail(userId: string, profileId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, suspended: true, emailVerified: true, tutorProfile: true },
  });
  if (!user?.email || !user.emailVerified || user.role !== "TUTOR" || user.suspended || !user.tutorProfile) {
    return { sent: false, reason: "ineligible" as const };
  }
  if (!tutorCompletionInput(user, user.tutorProfile).complete) {
    return { sent: false, reason: "incomplete" as const };
  }

  const claimed = await claimEmailEvent(userId, NURTURE_SEQUENCES.TUTOR_PROFILE_LIVE);
  if (!claimed) return { sent: false, reason: "already_sent" as const };

  try {
    await sendEmail({
      to: user.email,
      subject: "You're live in search · My Tutoring Hub",
      html: tutorProfileLiveEmailHtml({
        name: user.name,
        profileUrl: `${appUrl()}/tutors/${profileId}`,
        dashboardUrl: `${appUrl()}/dashboard/tutor`,
      }),
    });
    return { sent: true as const };
  } catch (err) {
    await releaseEmailEvent(userId, NURTURE_SEQUENCES.TUTOR_PROFILE_LIVE);
    throw err;
  }
}

export async function sendTutorPlanNudgeEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, suspended: true, emailVerified: true },
  });
  if (!user?.email || !user.emailVerified || user.role !== "TUTOR" || user.suspended) {
    return { sent: false, reason: "ineligible" as const };
  }
  if (await hasAnyActivePlan(userId, ["TUTOR_BASIC", "VERIFIED_TUTOR", "HIGHLIGHTED_AD", "AD_BOOST", "UNLIMITED_ADS"])) {
    return { sent: false, reason: "has_plan" as const };
  }

  const claimed = await claimEmailEvent(userId, NURTURE_SEQUENCES.TUTOR_PLAN_NUDGE);
  if (!claimed) return { sent: false, reason: "already_sent" as const };

  try {
    await sendEmail({
      to: user.email,
      subject: "Grow with Tutor Basic · My Tutoring Hub",
      html: tutorPlanNudgeEmailHtml({
        name: user.name,
        pricingUrl: `${appUrl()}/pricing`,
      }),
    });
    return { sent: true as const };
  } catch (err) {
    await releaseEmailEvent(userId, NURTURE_SEQUENCES.TUTOR_PLAN_NUDGE);
    throw err;
  }
}

export async function sendTutorVerifyNudgeEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tutorProfile: true },
  });
  if (!user?.email || !user.emailVerified || user.role !== "TUTOR" || user.suspended || !user.tutorProfile) {
    return { sent: false, reason: "ineligible" as const };
  }
  if (user.tutorProfile.verified) return { sent: false, reason: "already_verified" as const };
  if (!tutorCompletionInput(user, user.tutorProfile).complete) {
    return { sent: false, reason: "incomplete" as const };
  }

  const claimed = await claimEmailEvent(userId, NURTURE_SEQUENCES.TUTOR_VERIFY_NUDGE);
  if (!claimed) return { sent: false, reason: "already_sent" as const };

  try {
    await sendEmail({
      to: user.email,
      subject: "Get your verified tutor badge · My Tutoring Hub",
      html: tutorVerifyNudgeEmailHtml({
        name: user.name,
        dashboardUrl: `${appUrl()}/dashboard/tutor`,
      }),
    });
    return { sent: true as const };
  } catch (err) {
    await releaseEmailEvent(userId, NURTURE_SEQUENCES.TUTOR_VERIFY_NUDGE);
    throw err;
  }
}

export async function sendStudentBrowseNudgeEmail(userId: string, step: 1 | 2) {
  const sequence = step === 1 ? NURTURE_SEQUENCES.STUDENT_BROWSE_R1 : NURTURE_SEQUENCES.STUDENT_BROWSE_R2;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      suspended: true,
      emailVerified: true,
      _count: { select: { messages: true } },
    },
  });
  if (!user?.email || !user.emailVerified || user.role !== "STUDENT" || user.suspended) {
    return { sent: false, reason: "ineligible" as const };
  }
  if (user._count.messages > 0) return { sent: false, reason: "has_messages" as const };

  const claimed = await claimEmailEvent(userId, sequence);
  if (!claimed) return { sent: false, reason: "already_sent" as const };

  try {
    await sendEmail({
      to: user.email,
      subject: step === 1 ? "Find your tutor · My Tutoring Hub" : "Tutors are waiting · My Tutoring Hub",
      html: studentBrowseNudgeEmailHtml({
        name: user.name,
        searchUrl: `${appUrl()}/search`,
        step,
      }),
    });
    return { sent: true as const };
  } catch (err) {
    await releaseEmailEvent(userId, sequence);
    throw err;
  }
}

export async function sendStudentPostAdNudgeEmail(userId: string, step: 1 | 2) {
  const sequence = step === 1 ? NURTURE_SEQUENCES.STUDENT_POST_AD_R1 : NURTURE_SEQUENCES.STUDENT_POST_AD_R2;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      suspended: true,
      emailVerified: true,
      _count: { select: { studentAds: true } },
    },
  });
  if (!user?.email || !user.emailVerified || user.role !== "STUDENT" || user.suspended) {
    return { sent: false, reason: "ineligible" as const };
  }
  if (user._count.studentAds > 0) return { sent: false, reason: "has_ads" as const };
  if (!(await hasAnyActivePlan(userId, ["STUDENT_PASS", "STUDENT_PRO"]))) {
    return { sent: false, reason: "no_pass" as const };
  }

  const claimed = await claimEmailEvent(userId, sequence);
  if (!claimed) return { sent: false, reason: "already_sent" as const };

  try {
    await sendEmail({
      to: user.email,
      subject: step === 1 ? "Post your first student request" : "Let tutors find you · My Tutoring Hub",
      html: studentPostAdNudgeEmailHtml({
        name: user.name,
        adsUrl: `${appUrl()}/ads/new`,
        step,
      }),
    });
    return { sent: true as const };
  } catch (err) {
    await releaseEmailEvent(userId, sequence);
    throw err;
  }
}

export async function sendStudentReferralNudgeEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, suspended: true, emailVerified: true },
  });
  if (!user?.email || !user.emailVerified || user.suspended) {
    return { sent: false, reason: "ineligible" as const };
  }

  const claimed = await claimEmailEvent(userId, NURTURE_SEQUENCES.STUDENT_REFERRAL_NUDGE);
  if (!claimed) return { sent: false, reason: "already_sent" as const };

  try {
    const dashboard =
      user.role === "TUTOR" ? `${appUrl()}/dashboard/tutor` : `${appUrl()}/dashboard/student`;
    await sendEmail({
      to: user.email,
      subject: "Earn Hub Points by inviting friends · My Tutoring Hub",
      html: studentReferralNudgeEmailHtml({ name: user.name, dashboardUrl: dashboard }),
    });
    return { sent: true as const };
  } catch (err) {
    await releaseEmailEvent(userId, NURTURE_SEQUENCES.STUDENT_REFERRAL_NUDGE);
    throw err;
  }
}

export async function sendVerifyReminder7Email(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, suspended: true, emailVerified: true },
  });
  if (!user?.email || user.emailVerified || user.suspended) {
    return { sent: false, reason: "ineligible" as const };
  }

  const claimed = await claimEmailEvent(userId, NURTURE_SEQUENCES.VERIFY_REMINDER_7);
  if (!claimed) return { sent: false, reason: "already_sent" as const };

  try {
    await sendEmail({
      to: user.email,
      subject: "Still need to confirm your email · My Tutoring Hub",
      html: verificationReminderEmailHtml({
        name: user.name,
        verifyUrl: `${appUrl()}/dashboard?verify=1`,
      }),
    });
    return { sent: true as const };
  } catch (err) {
    await releaseEmailEvent(userId, NURTURE_SEQUENCES.VERIFY_REMINDER_7);
    throw err;
  }
}

export async function sendRecommendationSubmittedEmail(recommendationId: string) {
  const item = await prisma.tutorRecommendation.findUnique({
    where: { id: recommendationId },
    include: { tutorProfile: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });
  if (!item?.tutorProfile.user.email) return { sent: false, reason: "not_found" as const };

  const sequence = `recommendation_submitted:${recommendationId}`;
  const claimed = await claimEmailEvent(item.tutorProfile.user.id, sequence);
  if (!claimed) return { sent: false, reason: "already_sent" as const };

  try {
    await sendEmail({
      to: item.tutorProfile.user.email,
      subject: "Recommendation received · My Tutoring Hub",
      html: recommendationSubmittedEmailHtml({
        name: item.tutorProfile.user.name,
        recommenderName: item.recommenderName,
        dashboardUrl: `${appUrl()}/dashboard/tutor#tutor-recommendations`,
      }),
    });
    return { sent: true as const };
  } catch (err) {
    await releaseEmailEvent(item.tutorProfile.user.id, sequence);
    throw err;
  }
}

export async function sendRecommendationApprovedEmail(recommendationId: string) {
  const item = await prisma.tutorRecommendation.findUnique({
    where: { id: recommendationId },
    include: {
      tutorProfile: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          recommendations: { where: { status: "APPROVED" }, select: { id: true } },
        },
      },
    },
  });
  if (!item?.tutorProfile.user.email) return { sent: false, reason: "not_found" as const };

  const sequence = `recommendation_approved:${recommendationId}`;
  const claimed = await claimEmailEvent(item.tutorProfile.user.id, sequence);
  if (!claimed) return { sent: false, reason: "already_sent" as const };

  const approvedCount = item.tutorProfile.recommendations.length;
  const badgeLabel =
    approvedCount >= 4
      ? trustBadgeMeta("TOP").label
      : approvedCount >= 2
        ? trustBadgeMeta("SUPER").label
        : trustBadgeMeta("RECOMMENDED").label;

  try {
    await sendEmail({
      to: item.tutorProfile.user.email,
      subject: "Recommendation approved · My Tutoring Hub",
      html: recommendationApprovedEmailHtml({
        name: item.tutorProfile.user.name,
        recommenderName: item.recommenderName,
        profileUrl: `${appUrl()}/tutors/${item.tutorProfileId}`,
        badgeLabel,
      }),
    });
    return { sent: true as const };
  } catch (err) {
    await releaseEmailEvent(item.tutorProfile.user.id, sequence);
    throw err;
  }
}

export async function sendRecommendationRejectedEmail(recommendationId: string, adminNote?: string | null) {
  const item = await prisma.tutorRecommendation.findUnique({
    where: { id: recommendationId },
    include: { tutorProfile: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });
  if (!item?.tutorProfile.user.email) return { sent: false, reason: "not_found" as const };

  const sequence = `recommendation_rejected:${recommendationId}`;
  const claimed = await claimEmailEvent(item.tutorProfile.user.id, sequence);
  if (!claimed) return { sent: false, reason: "already_sent" as const };

  try {
    await sendEmail({
      to: item.tutorProfile.user.email,
      subject: "Recommendation not approved · My Tutoring Hub",
      html: recommendationRejectedEmailHtml({
        name: item.tutorProfile.user.name,
        recommenderName: item.recommenderName,
        adminNote: adminNote || item.adminNote || undefined,
        dashboardUrl: `${appUrl()}/dashboard/tutor#tutor-recommendations`,
      }),
    });
    return { sent: true as const };
  } catch (err) {
    await releaseEmailEvent(item.tutorProfile.user.id, sequence);
    throw err;
  }
}

export async function sendReviewPublishedEmail(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      student: { select: { name: true } },
      tutorProfile: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!review?.tutorProfile.user.email) return { sent: false, reason: "not_found" as const };

  const sequence = `review_published:${reviewId}`;
  const claimed = await claimEmailEvent(review.tutorProfile.user.id, sequence);
  if (!claimed) return { sent: false, reason: "already_sent" as const };

  try {
    await sendEmail({
      to: review.tutorProfile.user.email,
      subject: "New review on your profile · My Tutoring Hub",
      html: reviewPublishedEmailHtml({
        name: review.tutorProfile.user.name,
        studentName: review.student.name,
        rating: review.rating,
        commentPreview: review.comment,
        profileUrl: `${appUrl()}/tutors/${review.tutorProfileId}`,
      }),
    });
    return { sent: true as const };
  } catch (err) {
    await releaseEmailEvent(review.tutorProfile.user.id, sequence);
    throw err;
  }
}

export async function sendVerificationApprovedEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tutorProfile: { select: { id: true, verified: true } } },
  });
  if (!user?.email || !user.tutorProfile?.verified) {
    return { sent: false, reason: "ineligible" as const };
  }

  const claimed = await claimEmailEvent(userId, "verification_approved");
  if (!claimed) return { sent: false, reason: "already_sent" as const };

  try {
    await sendEmail({
      to: user.email,
      subject: "You're verified · My Tutoring Hub",
      html: tutorVerificationApprovedEmailHtml({
        name: user.name,
        profileUrl: `${appUrl()}/tutors/${user.tutorProfile.id}`,
      }),
    });
    return { sent: true as const };
  } catch (err) {
    await releaseEmailEvent(userId, "verification_approved");
    throw err;
  }
}

async function countSent(results: { sent: boolean }[]) {
  return results.filter((r) => r.sent).length;
}

/** Daily nurture cron — tutor/student drips and follow-up reminders. */
export async function runNurtureDigest() {
  if (!emailConfigured()) {
    return { ok: true, skipped: true, sent: {} };
  }

  const now = Date.now();
  const day = 86400000;
  const sent: Record<string, number> = {};

  const oneDayAgo = new Date(now - day);
  const twoDaysAgo = new Date(now - 2 * day);
  const threeDaysAgo = new Date(now - 3 * day);
  const fourDaysAgo = new Date(now - 4 * day);
  const sevenDaysAgo = new Date(now - 7 * day);
  const fourteenDaysAgo = new Date(now - 14 * day);

  // Tutor profile reminder 1
  const tutorR1 = await prisma.user.findMany({
    where: {
      role: "TUTOR",
      suspended: false,
      emailVerified: { not: null, lte: oneDayAgo },
      tutorProfile: { isNot: null },
      emailSequenceEvents: { none: { sequence: NURTURE_SEQUENCES.TUTOR_PROFILE_R1 } },
    },
    include: { tutorProfile: true },
    take: 40,
  });
  sent.tutorProfileR1 = await countSent(
    await Promise.all(
      tutorR1.map(async (user) => {
        if (!user.tutorProfile || !isTutorProfileStarted(user.tutorProfile)) return { sent: false };
        if (isTutorProfileComplete({ ...user.tutorProfile, name: user.name })) return { sent: false };
        try {
          return await sendTutorProfileReminderEmail(user.id, 1);
        } catch (err) {
          console.error("[nurture] tutor_profile_r1", user.id, err);
          return { sent: false };
        }
      }),
    ),
  );

  // Tutor profile reminder 2 (2 days after R1)
  const tutorR2Events = await prisma.emailSequenceEvent.findMany({
    where: {
      sequence: NURTURE_SEQUENCES.TUTOR_PROFILE_R1,
      sentAt: { lte: twoDaysAgo },
      user: {
        role: "TUTOR",
        suspended: false,
        emailSequenceEvents: { none: { sequence: NURTURE_SEQUENCES.TUTOR_PROFILE_R2 } },
      },
    },
    select: { userId: true },
    take: 40,
  });
  sent.tutorProfileR2 = await countSent(
    await Promise.all(
      tutorR2Events.map(async (row) => {
        try {
          return await sendTutorProfileReminderEmail(row.userId, 2);
        } catch (err) {
          console.error("[nurture] tutor_profile_r2", row.userId, err);
          return { sent: false };
        }
      }),
    ),
  );

  // Tutor profile reminder 3 (5 days after R2 ≈ day 7 total)
  const tutorR3Events = await prisma.emailSequenceEvent.findMany({
    where: {
      sequence: NURTURE_SEQUENCES.TUTOR_PROFILE_R2,
      sentAt: { lte: new Date(now - 4 * day) },
      user: {
        role: "TUTOR",
        suspended: false,
        emailSequenceEvents: { none: { sequence: NURTURE_SEQUENCES.TUTOR_PROFILE_R3 } },
      },
    },
    select: { userId: true },
    take: 40,
  });
  sent.tutorProfileR3 = await countSent(
    await Promise.all(
      tutorR3Events.map(async (row) => {
        try {
          return await sendTutorProfileReminderEmail(row.userId, 3);
        } catch (err) {
          console.error("[nurture] tutor_profile_r3", row.userId, err);
          return { sent: false };
        }
      }),
    ),
  );

  // Tutor profile reminder 4 (7 days after R3 ≈ day 14)
  const tutorR4Events = await prisma.emailSequenceEvent.findMany({
    where: {
      sequence: NURTURE_SEQUENCES.TUTOR_PROFILE_R3,
      sentAt: { lte: new Date(now - 7 * day) },
      user: {
        role: "TUTOR",
        suspended: false,
        emailSequenceEvents: { none: { sequence: NURTURE_SEQUENCES.TUTOR_PROFILE_R4 } },
      },
    },
    select: { userId: true },
    take: 40,
  });
  sent.tutorProfileR4 = await countSent(
    await Promise.all(
      tutorR4Events.map(async (row) => {
        try {
          return await sendTutorProfileReminderEmail(row.userId, 4);
        } catch (err) {
          console.error("[nurture] tutor_profile_r4", row.userId, err);
          return { sent: false };
        }
      }),
    ),
  );

  // Never started profile
  const neverStarted = await prisma.user.findMany({
    where: {
      role: "TUTOR",
      suspended: false,
      emailVerified: { not: null, lte: threeDaysAgo },
      tutorProfile: { isNot: null },
      emailSequenceEvents: {
        none: {
          sequence: { in: [NURTURE_SEQUENCES.TUTOR_PROFILE_NEVER_STARTED, NURTURE_SEQUENCES.TUTOR_PROFILE_R1] },
        },
      },
    },
    include: { tutorProfile: true },
    take: 40,
  });
  sent.tutorNeverStarted = await countSent(
    await Promise.all(
      neverStarted.map(async (user) => {
        if (!user.tutorProfile || isTutorProfileStarted(user.tutorProfile)) return { sent: false };
        try {
          return await sendTutorProfileNeverStartedEmail(user.id);
        } catch (err) {
          console.error("[nurture] tutor_never_started", user.id, err);
          return { sent: false };
        }
      }),
    ),
  );

  // Tutor plan nudge (3 days after profile live)
  const planNudge = await prisma.emailSequenceEvent.findMany({
    where: {
      sequence: NURTURE_SEQUENCES.TUTOR_PROFILE_LIVE,
      sentAt: { lte: threeDaysAgo },
      user: {
        role: "TUTOR",
        suspended: false,
        emailSequenceEvents: { none: { sequence: NURTURE_SEQUENCES.TUTOR_PLAN_NUDGE } },
      },
    },
    select: { userId: true },
    take: 40,
  });
  sent.tutorPlanNudge = await countSent(
    await Promise.all(
      planNudge.map(async (row) => {
        try {
          return await sendTutorPlanNudgeEmail(row.userId);
        } catch (err) {
          console.error("[nurture] tutor_plan_nudge", row.userId, err);
          return { sent: false };
        }
      }),
    ),
  );

  // Tutor verify nudge (7 days after profile live)
  const verifyNudge = await prisma.emailSequenceEvent.findMany({
    where: {
      sequence: NURTURE_SEQUENCES.TUTOR_PROFILE_LIVE,
      sentAt: { lte: sevenDaysAgo },
      user: {
        role: "TUTOR",
        suspended: false,
        emailSequenceEvents: { none: { sequence: NURTURE_SEQUENCES.TUTOR_VERIFY_NUDGE } },
      },
    },
    select: { userId: true },
    take: 40,
  });
  sent.tutorVerifyNudge = await countSent(
    await Promise.all(
      verifyNudge.map(async (row) => {
        try {
          return await sendTutorVerifyNudgeEmail(row.userId);
        } catch (err) {
          console.error("[nurture] tutor_verify_nudge", row.userId, err);
          return { sent: false };
        }
      }),
    ),
  );

  // Student browse nudge 1 (3 days after verify, 0 messages)
  const browseR1 = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      suspended: false,
      emailVerified: { not: null, lte: threeDaysAgo },
      messages: { none: {} },
      emailSequenceEvents: { none: { sequence: NURTURE_SEQUENCES.STUDENT_BROWSE_R1 } },
    },
    select: { id: true },
    take: 40,
  });
  sent.studentBrowseR1 = await countSent(
    await Promise.all(
      browseR1.map(async (row) => {
        try {
          return await sendStudentBrowseNudgeEmail(row.id, 1);
        } catch (err) {
          console.error("[nurture] student_browse_r1", row.id, err);
          return { sent: false };
        }
      }),
    ),
  );

  // Student browse nudge 2 (4 days after R1)
  const browseR2 = await prisma.emailSequenceEvent.findMany({
    where: {
      sequence: NURTURE_SEQUENCES.STUDENT_BROWSE_R1,
      sentAt: { lte: fourDaysAgo },
      user: {
        role: "STUDENT",
        suspended: false,
        messages: { none: {} },
        emailSequenceEvents: { none: { sequence: NURTURE_SEQUENCES.STUDENT_BROWSE_R2 } },
      },
    },
    select: { userId: true },
    take: 40,
  });
  sent.studentBrowseR2 = await countSent(
    await Promise.all(
      browseR2.map(async (row) => {
        try {
          return await sendStudentBrowseNudgeEmail(row.userId, 2);
        } catch (err) {
          console.error("[nurture] student_browse_r2", row.userId, err);
          return { sent: false };
        }
      }),
    ),
  );

  // Student post ad nudge 1 (3 days after student pass, 0 ads)
  const postAdR1 = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      suspended: false,
      emailVerified: { not: null },
      studentAds: { none: {} },
      subscriptions: {
        some: { plan: { in: ["STUDENT_PASS", "STUDENT_PRO"] }, status: { in: ["ACTIVE", "TRIALING"] } },
      },
      emailSequenceEvents: { none: { sequence: NURTURE_SEQUENCES.STUDENT_POST_AD_R1 } },
    },
    select: { id: true, subscriptions: { where: { plan: { in: ["STUDENT_PASS", "STUDENT_PRO"] }, status: { in: ["ACTIVE", "TRIALING"] } }, orderBy: { createdAt: "asc" }, take: 1 } },
    take: 40,
  });
  sent.studentPostAdR1 = await countSent(
    await Promise.all(
      postAdR1.map(async (row) => {
        const sub = row.subscriptions[0];
        if (!sub || sub.createdAt > threeDaysAgo) return { sent: false };
        try {
          return await sendStudentPostAdNudgeEmail(row.id, 1);
        } catch (err) {
          console.error("[nurture] student_post_ad_r1", row.id, err);
          return { sent: false };
        }
      }),
    ),
  );

  // Student post ad nudge 2 (7 days after R1)
  const postAdR2 = await prisma.emailSequenceEvent.findMany({
    where: {
      sequence: NURTURE_SEQUENCES.STUDENT_POST_AD_R1,
      sentAt: { lte: sevenDaysAgo },
      user: {
        role: "STUDENT",
        suspended: false,
        studentAds: { none: {} },
        emailSequenceEvents: { none: { sequence: NURTURE_SEQUENCES.STUDENT_POST_AD_R2 } },
      },
    },
    select: { userId: true },
    take: 40,
  });
  sent.studentPostAdR2 = await countSent(
    await Promise.all(
      postAdR2.map(async (row) => {
        try {
          return await sendStudentPostAdNudgeEmail(row.userId, 2);
        } catch (err) {
          console.error("[nurture] student_post_ad_r2", row.userId, err);
          return { sent: false };
        }
      }),
    ),
  );

  // Referral nudge (14 days after verify)
  const referral = await prisma.user.findMany({
    where: {
      suspended: false,
      emailVerified: { not: null, lte: fourteenDaysAgo },
      emailSequenceEvents: { none: { sequence: NURTURE_SEQUENCES.STUDENT_REFERRAL_NUDGE } },
    },
    select: { id: true },
    take: 40,
  });
  sent.referralNudge = await countSent(
    await Promise.all(
      referral.map(async (row) => {
        try {
          return await sendStudentReferralNudgeEmail(row.id);
        } catch (err) {
          console.error("[nurture] referral_nudge", row.id, err);
          return { sent: false };
        }
      }),
    ),
  );

  // Verify reminder day 7
  const verify7 = await prisma.user.findMany({
    where: {
      suspended: false,
      emailVerified: null,
      createdAt: { gte: new Date(now - 8 * day), lte: sevenDaysAgo },
      emailSequenceEvents: { none: { sequence: NURTURE_SEQUENCES.VERIFY_REMINDER_7 } },
    },
    select: { id: true },
    take: 40,
  });
  sent.verifyReminder7 = await countSent(
    await Promise.all(
      verify7.map(async (row) => {
        try {
          return await sendVerifyReminder7Email(row.id);
        } catch (err) {
          console.error("[nurture] verify_reminder_7", row.id, err);
          return { sent: false };
        }
      }),
    ),
  );

  return { ok: true, sent };
}
