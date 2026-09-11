/**
 * Revenue intelligence metrics from observed Prisma data only.
 * No forecasts. Complimentary activations count as 0 cash.
 * No schema changes required.
 */

import { prisma } from "@/lib/prisma";
import { parseSafepayStoredAmount } from "@/lib/analytics-conversions";
import {
  STUDENT_FREE_CONTACT_LIMIT,
  STUDENT_PASS_PAPER_DOWNLOADS,
  TUTOR_FREE_REVEAL_LIMIT,
} from "@/lib/plan-limits";

function monthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function pct(n: number, d: number) {
  if (d <= 0) return null;
  return (n / d) * 100;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export type RevenueIntelligenceReport = Awaited<ReturnType<typeof computeRevenueIntelligence>>;

export async function computeRevenueIntelligence(opts?: { since?: Date; now?: Date }) {
  const now = opts?.now ?? new Date();
  const since = opts?.since ?? monthStart(now);
  const monthKey = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}`;

  const [
    studentRegs,
    tutorRegs,
    searchShown,
    searchZero,
    profileViews,
    contactUsage,
    revealUsage,
    paperDownloads,
    contactLimitHits,
    revealLimitHits,
    paperQuotaHits,
    conversations,
    matchFeedback,
    subscriptionsCreated,
    allActiveSubs,
    paperPurchases,
    activeTeachingProfiles,
    liveTutorProfiles,
    studentsWithContact,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT", createdAt: { gte: since } } }),
    prisma.user.count({ where: { role: "TUTOR", createdAt: { gte: since } } }),
    prisma.searchAnalyticsEvent.count({
      where: { type: "search_results_shown", createdAt: { gte: since } },
    }),
    prisma.searchAnalyticsEvent.count({
      where: { type: "search_zero_results", createdAt: { gte: since } },
    }),
    prisma.profileView.count({ where: { viewedAt: { gte: since } } }),
    prisma.usageEvent.count({
      where: { type: "tutor_contact", createdAt: { gte: since } },
    }),
    prisma.usageEvent.count({
      where: { type: "enquiry_reveal", createdAt: { gte: since } },
    }),
    prisma.usageEvent.count({
      where: { type: "paper_download", createdAt: { gte: since } },
    }),
    prisma.usageEvent.count({
      where: { type: "tutor_contact_limit_hit", createdAt: { gte: since } },
    }),
    prisma.usageEvent.count({
      where: { type: "enquiry_reveal_limit_hit", createdAt: { gte: since } },
    }),
    prisma.usageEvent.count({
      where: { type: "paper_quota_exhausted", createdAt: { gte: since } },
    }),
    prisma.conversation.findMany({
      where: { createdAt: { gte: since } },
      select: {
        id: true,
        createdAt: true,
        userA: { select: { id: true, role: true } },
        userB: { select: { id: true, role: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          select: { senderId: true, createdAt: true, sender: { select: { role: true } } },
          take: 40,
        },
      },
      take: 2000,
    }),
    prisma.marketplaceMatchFeedback.findMany({
      where: { createdAt: { gte: since }, answer: { in: ["YES", "NO"] } },
      select: { role: true, answer: true },
    }),
    prisma.subscription.findMany({
      where: {
        createdAt: { gte: since },
        status: { in: ["ACTIVE", "TRIALING"] },
        plan: {
          in: ["STUDENT_PASS", "STUDENT_PRO", "TUTOR_BASIC", "AD_BOOST", "VERIFIED_TUTOR"],
        },
      },
      select: {
        id: true,
        plan: true,
        userId: true,
        createdAt: true,
        stripePriceId: true,
        billingPeriod: true,
        status: true,
      },
    }),
    prisma.subscription.findMany({
      where: {
        status: { in: ["ACTIVE", "TRIALING"] },
        OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
        plan: { in: ["STUDENT_PASS", "STUDENT_PRO", "TUTOR_BASIC", "AD_BOOST", "VERIFIED_TUTOR"] },
      },
      select: { plan: true, userId: true, stripePriceId: true },
    }),
    prisma.pastPaperPurchase.findMany({
      where: { status: "PAID", createdAt: { gte: since }, amountPkr: { gt: 0 } },
      select: { amountPkr: true, userId: true },
    }),
    prisma.subjectProfile.count({ where: { status: "ACTIVE" } }),
    prisma.tutorProfile.count({ where: { active: true } }),
    prisma.usageEvent.groupBy({
      by: ["userId"],
      where: { type: "tutor_contact", createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  const studentTutorConvos = conversations.filter((c) => {
    const roles = new Set([c.userA.role, c.userB.role]);
    return roles.has("STUDENT") && roles.has("TUTOR");
  });

  let tutorResponded = 0;
  const replyMinutes: number[] = [];
  for (const c of studentTutorConvos) {
    const tutorId = c.userA.role === "TUTOR" ? c.userA.id : c.userB.id;
    const studentId = c.userA.role === "STUDENT" ? c.userA.id : c.userB.id;
    const firstStudent = c.messages.find((m) => m.senderId === studentId);
    if (!firstStudent) continue;
    const firstTutorAfter = c.messages.find(
      (m) => m.senderId === tutorId && m.createdAt >= firstStudent.createdAt,
    );
    if (firstTutorAfter) {
      tutorResponded += 1;
      replyMinutes.push(
        (firstTutorAfter.createdAt.getTime() - firstStudent.createdAt.getTime()) / 60000,
      );
    }
  }

  const studentYes = matchFeedback.filter((r) => r.role === "STUDENT" && r.answer === "YES").length;
  const studentAns = matchFeedback.filter((r) => r.role === "STUDENT").length;
  const tutorYes = matchFeedback.filter((r) => r.role === "TUTOR" && r.answer === "YES").length;
  const tutorAns = matchFeedback.filter((r) => r.role === "TUTOR").length;

  function cashForSub(stripePriceId: string | null) {
    const parsed = parseSafepayStoredAmount(stripePriceId);
    return parsed.complimentary ? 0 : parsed.major;
  }

  const revenueByPlan: Record<string, { count: number; paidCount: number; cash: number }> = {
    STUDENT_PASS: { count: 0, paidCount: 0, cash: 0 },
    STUDENT_PRO: { count: 0, paidCount: 0, cash: 0 },
    TUTOR_BASIC: { count: 0, paidCount: 0, cash: 0 },
    AD_BOOST: { count: 0, paidCount: 0, cash: 0 },
    VERIFIED_TUTOR: { count: 0, paidCount: 0, cash: 0 },
  };

  for (const s of subscriptionsCreated) {
    const bucket = revenueByPlan[s.plan];
    if (!bucket) continue;
    bucket.count += 1;
    const cash = cashForSub(s.stripePriceId);
    if (cash > 0) {
      bucket.paidCount += 1;
      bucket.cash += cash;
    }
  }

  const paperCash = paperPurchases.reduce((a, p) => a + p.amountPkr, 0);
  const totalPlatformRevenue =
    Object.values(revenueByPlan).reduce((a, b) => a + b.cash, 0) + paperCash;

  const proUserIds = new Set(
    allActiveSubs.filter((s) => s.plan === "TUTOR_BASIC").map((s) => s.userId),
  );
  const activeProTutors = proUserIds.size;
  const activeFreeTutors = Math.max(0, liveTutorProfiles - activeProTutors);

  const contactLimitUserIds = new Set(
    (
      await prisma.usageEvent.findMany({
        where: { type: "tutor_contact_limit_hit", createdAt: { gte: since } },
        select: { userId: true },
        distinct: ["userId"],
      })
    ).map((r) => r.userId),
  );
  const revealLimitUserIds = new Set(
    (
      await prisma.usageEvent.findMany({
        where: { type: "enquiry_reveal_limit_hit", createdAt: { gte: since } },
        select: { userId: true },
        distinct: ["userId"],
      })
    ).map((r) => r.userId),
  );

  const passBuyers = new Set(
    subscriptionsCreated.filter((s) => s.plan === "STUDENT_PASS").map((s) => s.userId),
  );
  const proBuyers = new Set(
    subscriptionsCreated.filter((s) => s.plan === "TUTOR_BASIC" && cashForSub(s.stripePriceId) > 0).map(
      (s) => s.userId,
    ),
  );
  const studentProBuyers = new Set(
    subscriptionsCreated.filter((s) => s.plan === "STUDENT_PRO").map((s) => s.userId),
  );

  let limitToPass = 0;
  for (const uid of contactLimitUserIds) {
    if (passBuyers.has(uid)) limitToPass += 1;
  }
  let revealToPro = 0;
  for (const uid of revealLimitUserIds) {
    if (proBuyers.has(uid)) revealToPro += 1;
  }
  let quotaToStudentPro = 0;
  const quotaUsers = new Set(
    (
      await prisma.usageEvent.findMany({
        where: { type: "paper_quota_exhausted", createdAt: { gte: since } },
        select: { userId: true },
        distinct: ["userId"],
      })
    ).map((r) => r.userId),
  );
  for (const uid of quotaUsers) {
    if (studentProBuyers.has(uid)) quotaToStudentPro += 1;
  }

  const activeStudentsContacting = studentsWithContact.length;
  const avgContacts =
    activeStudentsContacting > 0 ? contactUsage / activeStudentsContacting : null;

  const newConnections = studentTutorConvos.length;
  const revenuePerConnection =
    newConnections > 0 ? totalPlatformRevenue / newConnections : null;

  const activeStudentsAll = await prisma.user.count({ where: { role: "STUDENT" } });
  const activeTutorsAll = await prisma.user.count({ where: { role: "TUTOR" } });

  // Free students who hit usage ≥ limit this month (proxy when no hit event)
  const freeLimitProxies = studentsWithContact.filter(
    (g) => g._count._all >= STUDENT_FREE_CONTACT_LIMIT,
  ).length;

  return {
    period: { since: since.toISOString(), now: now.toISOString(), monthKey },
    student: {
      registrations: studentRegs,
      searchResultViews: searchShown,
      searchZeroResults: searchZero,
      teachingProfileViewsApprox: profileViews,
      newTutorContacts: contactUsage,
      searchToContactRate: pct(contactUsage, searchShown),
      averageNewContactsPerActiveStudent: avgContacts,
      usersReachingContactLimit: contactLimitUserIds.size || freeLimitProxies,
      contactLimitSource:
        contactLimitUserIds.size > 0 ? ("durable_hit_events" as const) : ("usage_proxy" as const),
      pctReachingContactLimit: pct(
        contactLimitUserIds.size || freeLimitProxies,
        Math.max(activeStudentsContacting, 1),
      ),
      studentPassPurchases: revenueByPlan.STUDENT_PASS!.count,
      studentPassPaid: revenueByPlan.STUDENT_PASS!.paidCount,
      studentProPurchases: revenueByPlan.STUDENT_PRO!.count,
      pctUpgradingAfterContactLimit: pct(limitToPass, contactLimitUserIds.size || freeLimitProxies),
    },
    tutor: {
      registrations: tutorRegs,
      liveProfiles: liveTutorProfiles,
      activeFreeTutors,
      activeProTutors,
      activeTeachingProfiles,
      enquiryReveals: revealUsage,
      tutorsReachingRevealLimit: revealLimitUserIds.size,
      pctUpgradingAfterRevealLimit: pct(revealToPro, revealLimitUserIds.size),
      tutorProPaidActivations: revenueByPlan.TUTOR_BASIC!.paidCount,
      tutorProComplimentaryActivations:
        revenueByPlan.TUTOR_BASIC!.count - revenueByPlan.TUTOR_BASIC!.paidCount,
      listingBoostPurchases: revenueByPlan.AD_BOOST!.count,
      priorityVerificationPurchases: revenueByPlan.VERIFIED_TUTOR!.count,
    },
    marketplace: {
      newStudentTutorConversations: newConnections,
      tutorResponseRate: pct(tutorResponded, newConnections),
      medianMinutesToFirstTutorReply: median(replyMinutes),
      averageMinutesToFirstTutorReply:
        replyMinutes.length > 0
          ? replyMinutes.reduce((a, b) => a + b, 0) / replyMinutes.length
          : null,
      studentSuccessfulMatchYesRate: pct(studentYes, studentAns),
      tutorSuccessfulOpportunityYesRate: pct(tutorYes, tutorAns),
      matchResponsesStudent: studentAns,
      matchResponsesTutor: tutorAns,
    },
    pastPapers: {
      downloads: paperDownloads,
      payPerPaperPurchases: paperPurchases.length,
      payPerPaperRevenuePkr: paperCash,
      passUsersReachingQuota: quotaUsers.size,
      studentProAfterQuota: quotaToStudentPro,
      pctProAfterQuota: pct(quotaToStudentPro, quotaUsers.size),
      passQuotaLimit: STUDENT_PASS_PAPER_DOWNLOADS,
      note: "Paper page views are GA-only until durable past_paper_view volume is needed in admin.",
    },
    revenue: {
      studentPass: revenueByPlan.STUDENT_PASS!.cash,
      studentPro: revenueByPlan.STUDENT_PRO!.cash,
      tutorProPaid: revenueByPlan.TUTOR_BASIC!.cash,
      listingBoost: revenueByPlan.AD_BOOST!.cash,
      priorityVerification: revenueByPlan.VERIFIED_TUTOR!.cash,
      pastPapersPkr: paperCash,
      totalPlatformRevenue,
      currencyNote:
        "Subscription cash parsed from safepay_{CURRENCY}_{minor} on Subscription.stripePriceId. Complimentary = 0. Past papers in PKR.",
    },
    keyMetrics: {
      search_to_contact_conversion_rate: pct(contactUsage, searchShown),
      teaching_profile_view_to_contact_rate: pct(contactUsage, profileViews),
      average_new_contacts_per_student: avgContacts,
      student_free_limit_hit_rate: pct(
        contactLimitUserIds.size || freeLimitProxies,
        Math.max(activeStudentsContacting, 1),
      ),
      contact_limit_to_pass_conversion_rate: pct(
        limitToPass,
        contactLimitUserIds.size || freeLimitProxies,
      ),
      tutor_free_reveal_limit_hit_rate: pct(
        revealLimitUserIds.size,
        Math.max(activeProTutors + activeFreeTutors, 1),
      ),
      reveal_limit_to_pro_conversion_rate: pct(revealToPro, revealLimitUserIds.size),
      tutor_response_rate: pct(tutorResponded, newConnections),
      average_or_median_time_to_first_tutor_reply_minutes: median(replyMinutes),
      successful_match_proxy_rate: pct(studentYes + tutorYes, studentAns + tutorAns),
      revenue_per_active_student:
        activeStudentsAll > 0 ? totalPlatformRevenue / activeStudentsAll : null,
      revenue_per_active_tutor:
        activeTutorsAll > 0 ? totalPlatformRevenue / activeTutorsAll : null,
      revenue_per_new_student_tutor_connection: revenuePerConnection,
    },
    limits: {
      STUDENT_FREE_CONTACT_LIMIT,
      TUTOR_FREE_REVEAL_LIMIT,
      STUDENT_PASS_PAPER_DOWNLOADS,
    },
    notYetMeasurable: [
      {
        metric: "search_to_contact (user-attributed)",
        why: "SearchAnalyticsEvent has no userId — rate uses volume proxy (contacts ÷ search_results_shown).",
      },
      {
        metric: "teaching_profile_view_to_contact (listing-attributed)",
        why: "ProfileView is tutor-profile scoped without viewer id; listing_viewed is not durable in DB.",
      },
      {
        metric: "past_paper_view (admin)",
        why: "GA past_paper_view only; no durable paper view table (by design this closeout).",
      },
      {
        metric: "Boost performance claims",
        why: "Parked — no reliable impression→contact attribution for boost windows.",
      },
    ],
  };
}
