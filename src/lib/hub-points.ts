import { prisma } from "@/lib/prisma";
import {
  formatHubPointsMoney,
  type CurrencyCode,
} from "@/lib/currency";
import {
  hubPointsEarnedEmailHtml,
  hubPointsExpiringEmailHtml,
  hubPointsRedeemedEmailHtml,
  hubPointsReferralPendingEmailHtml,
  sendEmail,
} from "@/lib/email";
import { isTutorProfileListable } from "@/lib/subscription";

/** 1 Hub Point = Rs 1 PKR (display converts to visitor currency). */
export const HUB_POINTS_PROFILE_COMPLETE = 200;
export const HUB_POINTS_REFERRAL = 50;
export const HUB_POINTS_REDEMPTION_MAX_RATIO = 0.5;
export const HUB_POINTS_MIN_CASH_PKR = 100;
export const HUB_POINTS_EXPIRY_MONTHS = 12;
export const HUB_POINTS_EXPIRY_WARNING_DAYS = 30;

export const HUB_POINT_TYPES = {
  PROFILE_COMPLETE: "PROFILE_COMPLETE",
  REFERRAL: "REFERRAL",
  REDEMPTION: "REDEMPTION",
  EXPIRY: "EXPIRY",
  ADMIN_ADJUST: "ADMIN_ADJUST",
} as const;

export type HubPointLedgerRow = {
  id: string;
  amount: number;
  balanceAfter: number;
  type: string;
  description: string;
  createdAt: Date;
};

export type HubPointsSummary = {
  balance: number;
  balanceLabel: string;
  currency: CurrencyCode;
  pointValueLabel: string;
  lastActivityAt: Date | null;
  expiresAt: Date | null;
  recent: HubPointLedgerRow[];
  referralLink: string;
  earnHints: string[];
  redeemHints: string[];
};

export type HubPointsEarnCard = {
  id: string;
  emoji: string;
  title: string;
  points: number;
  description: string;
  badge?: string;
};

export type HubPointsRedeemCard = {
  title: string;
  description: string;
  href: string;
  badge?: string;
};

export function hubPointsEarnCards(role: string): HubPointsEarnCard[] {
  if (role === "TUTOR") {
    return [
      {
        id: "profile",
        emoji: "✨",
        title: "Complete your profile",
        points: HUB_POINTS_PROFILE_COMPLETE,
        description: "Photo, subjects, headline & bio — appear in search",
        badge: "One-time",
      },
      {
        id: "refer-tutor",
        emoji: "🎓",
        title: "Invite a tutor",
        points: HUB_POINTS_REFERRAL,
        description: "When their profile goes live in search",
      },
      {
        id: "refer-student",
        emoji: "📚",
        title: "Invite a student",
        points: HUB_POINTS_REFERRAL,
        description: "When they message a tutor for the first time",
      },
    ];
  }
  return [
    {
      id: "refer-student",
      emoji: "📚",
      title: "Invite a student",
      points: HUB_POINTS_REFERRAL,
      description: "When they verify email and message a tutor",
    },
    {
      id: "refer-tutor",
      emoji: "🎓",
      title: "Invite a tutor",
      points: HUB_POINTS_REFERRAL,
      description: "When they complete their tutor profile",
    },
  ];
}

export function hubPointsRedeemCards(role: string): HubPointsRedeemCard[] {
  if (role === "TUTOR") {
    return [
      {
        title: "Tutor Pro",
        description: "Priority ranking & subject profiles",
        href: "/pricing?plan=TUTOR_BASIC",
        badge: "Popular",
      },
      {
        title: "Profile Boost",
        description: "Boost one subject listing for 30 days",
        href: "/dashboard/tutor?tab=profile#teaching-listings",
      },
      {
        title: "Highlighted profile",
        description: "Highlight one subject listing",
        href: "/dashboard/tutor?tab=profile#teaching-listings",
      },
      {
        title: "Unlimited Profiles",
        description: "No cap on active subject profiles",
        href: "/pricing",
      },
    ];
  }
  return [
    {
      title: "Student Pass",
      description: "Unlimited messaging & request ads",
      href: "/pricing?plan=STUDENT_PASS",
      badge: "Popular",
    },
    {
      title: "Student Pro",
      description: "AI study assistant + unlimited papers",
      href: "/pricing?plan=STUDENT_PRO",
    },
  ];
}

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "https://www.mytutoringhub.com";

function hubPointsEarnHints(role: string) {
  return role === "TUTOR"
    ? [
        `Complete your profile — ${HUB_POINTS_PROFILE_COMPLETE} pts (one-time)`,
        `Invite a tutor — ${HUB_POINTS_REFERRAL} pts when their profile goes live`,
        `Invite a student — ${HUB_POINTS_REFERRAL} pts when they message a tutor`,
      ]
    : [
        `Invite a student — ${HUB_POINTS_REFERRAL} pts when they message a tutor`,
        `Invite a tutor — ${HUB_POINTS_REFERRAL} pts when their profile goes live`,
      ];
}

function hubPointsRedeemHints(role: string) {
  return role === "TUTOR"
    ? ["Tutor Pro & add-ons", "Profile Boost", "Highlighted profile", "Unlimited Profiles"]
    : ["Student Pass", "Student Pro"];
}

function emptyHubPointsSummary(
  userId: string,
  currency: CurrencyCode,
  role: string,
): HubPointsSummary {
  const referralPath =
    role === "TUTOR"
      ? `/register?role=tutor&ref=${encodeURIComponent(userId)}`
      : `/register?role=student&ref=${encodeURIComponent(userId)}`;
  return {
    balance: 0,
    balanceLabel: formatHubPoints(0, currency),
    currency,
    pointValueLabel: hubPointValueLabel(currency),
    lastActivityAt: null,
    expiresAt: null,
    recent: [],
    referralLink: `${appUrl()}${referralPath}`,
    earnHints: hubPointsEarnHints(role),
    redeemHints: hubPointsRedeemHints(role),
  };
}

export function hubPointValueLabel(currency: CurrencyCode) {
  const onePoint = formatHubPointsMoney(1, currency);
  return `1 point ≈ ${onePoint}`;
}

export async function getHubPointsBalanceSafe(userId: string): Promise<number> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hubPointsBalance: true },
    });
    return user?.hubPointsBalance ?? 0;
  } catch (err) {
    console.error("[hub-points] balance lookup failed", { userId, err });
    return 0;
  }
}

export function formatHubPoints(points: number, currency: CurrencyCode = "USD") {
  return `${points.toLocaleString()} pts (${formatHubPointsMoney(points, currency)})`;
}

export function computeMaxRedeemablePoints(balance: number, orderPkr: number) {
  if (balance <= 0 || orderPkr <= 0) return 0;
  const capByPercent = Math.floor(orderPkr * HUB_POINTS_REDEMPTION_MAX_RATIO);
  let max = Math.min(balance, capByPercent);
  if (orderPkr - max < HUB_POINTS_MIN_CASH_PKR && orderPkr > HUB_POINTS_MIN_CASH_PKR) {
    max = Math.max(0, orderPkr - HUB_POINTS_MIN_CASH_PKR);
  }
  if (orderPkr <= HUB_POINTS_MIN_CASH_PKR) {
    max = Math.min(max, Math.max(0, orderPkr - 1));
  }
  return Math.max(0, max);
}

export async function getHubPointsSummary(
  userId: string,
  opts?: { currency?: CurrencyCode; role?: string; limit?: number },
): Promise<HubPointsSummary> {
  const currency = opts?.currency ?? "USD";
  const role = opts?.role ?? "STUDENT";

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        hubPointsBalance: true,
        hubPointsLastActivityAt: true,
        role: true,
        hubPointLedger: {
          orderBy: { createdAt: "desc" },
          take: opts?.limit ?? 8,
          select: {
            id: true,
            amount: true,
            balanceAfter: true,
            type: true,
            description: true,
            createdAt: true,
          },
        },
      },
    });

    const balance = user?.hubPointsBalance ?? 0;
    const lastActivityAt = user?.hubPointsLastActivityAt ?? null;
    const expiresAt = lastActivityAt
      ? new Date(
          lastActivityAt.getTime() + HUB_POINTS_EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000,
        )
      : null;

    const resolvedRole = opts?.role ?? user?.role ?? "STUDENT";
    const referralPath =
      resolvedRole === "TUTOR"
        ? `/register?role=tutor&ref=${encodeURIComponent(userId)}`
        : `/register?role=student&ref=${encodeURIComponent(userId)}`;

    return {
      balance,
      balanceLabel: formatHubPoints(balance, currency),
      currency,
      pointValueLabel: hubPointValueLabel(currency),
      lastActivityAt,
      expiresAt,
      recent: user?.hubPointLedger ?? [],
      referralLink: `${appUrl()}${referralPath}`,
      earnHints: hubPointsEarnHints(resolvedRole),
      redeemHints: hubPointsRedeemHints(resolvedRole),
    };
  } catch (err) {
    console.error("[hub-points] summary unavailable", { userId, err });
    return emptyHubPointsSummary(userId, currency, role);
  }
}

async function touchHubPointsActivity(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { hubPointsLastActivityAt: new Date() },
  });
}

export async function awardHubPoints(opts: {
  userId: string;
  amount: number;
  type: string;
  description: string;
  idempotencyKey: string;
  relatedUserId?: string;
  notify?: boolean;
}) {
  if (opts.amount === 0) return { awarded: false as const, reason: "zero" as const };

  try {
    const existing = await prisma.hubPointLedger.findUnique({
      where: { idempotencyKey: opts.idempotencyKey },
    });
    if (existing) return { awarded: false as const, reason: "duplicate" as const };

    const user = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: { id: true, name: true, email: true, hubPointsBalance: true, suspended: true },
    });
    if (!user || user.suspended) return { awarded: false as const, reason: "invalid_user" as const };

    const balanceAfter = user.hubPointsBalance + opts.amount;
    if (balanceAfter < 0) return { awarded: false as const, reason: "insufficient" as const };

    await prisma.$transaction([
      prisma.user.update({
        where: { id: opts.userId },
        data: {
          hubPointsBalance: balanceAfter,
          hubPointsLastActivityAt: new Date(),
        },
      }),
      prisma.hubPointLedger.create({
        data: {
          userId: opts.userId,
          amount: opts.amount,
          balanceAfter,
          type: opts.type,
          description: opts.description,
          relatedUserId: opts.relatedUserId,
          idempotencyKey: opts.idempotencyKey,
        },
      }),
    ]);

    if (opts.notify !== false && opts.amount > 0 && user.email) {
      void sendEmail({
        to: user.email,
        subject: `You earned ${opts.amount} Hub Points — My Tutoring Hub`,
        html: hubPointsEarnedEmailHtml({
          name: user.name,
          points: opts.amount,
          reason: opts.description,
          balance: balanceAfter,
          dashboardUrl: `${appUrl()}/dashboard`,
        }),
      }).catch((err) => console.error("[hub-points] earn email failed", err));
    }

    return { awarded: true as const, balanceAfter };
  } catch (err) {
    console.error("[hub-points] award failed", opts, err);
    return { awarded: false as const, reason: "error" as const };
  }
}

export async function attributeReferralOnSignup(refereeId: string, referrerIdRaw: string) {
  try {
    const referrerId = referrerIdRaw.trim();
    if (!referrerId || referrerId === refereeId) return;

    const [referee, referrer] = await Promise.all([
      prisma.user.findUnique({ where: { id: refereeId }, select: { referredByUserId: true } }),
      prisma.user.findUnique({
        where: { id: referrerId },
        select: { id: true, name: true, email: true, suspended: true },
      }),
    ]);
    if (!referee || referee.referredByUserId || !referrer || referrer.suspended) return;

    await prisma.user.update({
      where: { id: refereeId },
      data: { referredByUserId: referrerId },
    });

    if (referrer.email) {
      void sendEmail({
        to: referrer.email,
        subject: "Someone joined with your link — Hub Points pending",
        html: hubPointsReferralPendingEmailHtml({
          name: referrer.name,
          points: HUB_POINTS_REFERRAL,
          dashboardUrl: `${appUrl()}/dashboard`,
        }),
      }).catch((err) => console.error("[hub-points] referral pending email failed", err));
    }
  } catch (err) {
    console.error("[hub-points] attribute referral failed", { refereeId, err });
  }
}

async function creditReferrerForMilestone(refereeUserId: string, milestoneLabel: string) {
  const referee = await prisma.user.findUnique({
    where: { id: refereeUserId },
    select: { referredByUserId: true, name: true },
  });
  if (!referee?.referredByUserId) return;

  const referrerId = referee.referredByUserId;
  if (referrerId === refereeUserId) return;

  await awardHubPoints({
    userId: referrerId,
    amount: HUB_POINTS_REFERRAL,
    type: HUB_POINT_TYPES.REFERRAL,
    description: `Referral reward — ${referee.name || "your invite"} ${milestoneLabel}`,
    idempotencyKey: `referral:${referrerId}:${refereeUserId}`,
    relatedUserId: refereeUserId,
  });
}

export async function tryAwardProfileCompleteBonus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, name: true, tutorProfile: true },
  });
  if (user?.role !== "TUTOR" || !user.tutorProfile) return;
  if (!isTutorProfileListable(user.tutorProfile, user.name)) return;

  await awardHubPoints({
    userId,
    amount: HUB_POINTS_PROFILE_COMPLETE,
    type: HUB_POINT_TYPES.PROFILE_COMPLETE,
    description: "Profile complete — now visible in tutor search",
    idempotencyKey: `profile_complete:${userId}`,
  });

  await creditReferrerForMilestone(userId, "completed their tutor profile");
}

export async function tryAwardStudentReferralMilestone(studentUserId: string) {
  const student = await prisma.user.findUnique({
    where: { id: studentUserId },
    select: { role: true, emailVerified: true },
  });
  if (student?.role !== "STUDENT" || !student.emailVerified) return;

  const sentCount = await prisma.message.count({ where: { senderId: studentUserId } });
  if (sentCount !== 1) return;

  await creditReferrerForMilestone(studentUserId, "sent their first tutor message");
}

export async function deductHubPointsForRedemption(opts: {
  userId: string;
  points: number;
  subscriptionId: string;
  planName: string;
}) {
  if (opts.points <= 0) return { ok: true as const };

  const result = await awardHubPoints({
    userId: opts.userId,
    amount: -opts.points,
    type: HUB_POINT_TYPES.REDEMPTION,
    description: `Redeemed on ${opts.planName}`,
    idempotencyKey: `redemption:${opts.subscriptionId}`,
    notify: false,
  });
  if (!result.awarded) return { ok: false as const, reason: result.reason };

  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true, email: true, hubPointsBalance: true },
  });
  if (user?.email) {
    void sendEmail({
      to: user.email,
      subject: `Hub Points applied — ${opts.planName}`,
      html: hubPointsRedeemedEmailHtml({
        name: user.name,
        points: opts.points,
        planName: opts.planName,
        balance: user.hubPointsBalance,
        dashboardUrl: `${appUrl()}/dashboard`,
      }),
    }).catch((err) => console.error("[hub-points] redeem email failed", err));
  }

  return { ok: true as const };
}

export async function expireInactiveHubPointsForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      hubPointsBalance: true,
      hubPointsLastActivityAt: true,
      name: true,
      email: true,
    },
  });
  if (!user?.hubPointsLastActivityAt || user.hubPointsBalance <= 0) return false;

  const expiryAt = new Date(
    user.hubPointsLastActivityAt.getTime() + HUB_POINTS_EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000,
  );
  if (expiryAt > new Date()) return false;

  const amount = user.hubPointsBalance;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { hubPointsBalance: 0, hubPointsLastActivityAt: new Date() },
    }),
    prisma.hubPointLedger.create({
      data: {
        userId,
        amount: -amount,
        balanceAfter: 0,
        type: HUB_POINT_TYPES.EXPIRY,
        description: `Points expired after ${HUB_POINTS_EXPIRY_MONTHS} months of inactivity`,
        idempotencyKey: `expiry:${userId}:${expiryAt.toISOString().slice(0, 10)}`,
      },
    }),
  ]);
  return true;
}

export async function sendHubPointsExpiryWarnings() {
  const warnBefore = HUB_POINTS_EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000;
  const inactiveMs = HUB_POINTS_EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const windowStart = new Date(now - inactiveMs + warnBefore - 12 * 60 * 60 * 1000);
  const windowEnd = new Date(now - inactiveMs + warnBefore + 12 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: {
      hubPointsBalance: { gt: 0 },
      hubPointsLastActivityAt: { gte: windowStart, lte: windowEnd },
      suspended: false,
    },
    select: { id: true, name: true, email: true, hubPointsBalance: true, hubPointsLastActivityAt: true },
    take: 50,
  });

  let sent = 0;
  for (const user of users) {
    if (!user.email || !user.hubPointsLastActivityAt) continue;
    const expiresAt = new Date(user.hubPointsLastActivityAt.getTime() + inactiveMs);
    const key = `expiry_warn:${user.id}:${expiresAt.toISOString().slice(0, 10)}`;
    const claimed = await prisma.emailSequenceEvent
      .create({ data: { userId: user.id, sequence: key } })
      .then(() => true)
      .catch(() => false);
    if (!claimed) continue;

    try {
      await sendEmail({
        to: user.email,
        subject: "Your Hub Points expire soon — My Tutoring Hub",
        html: hubPointsExpiringEmailHtml({
          name: user.name,
          points: user.hubPointsBalance,
          expiresAt,
          pricingUrl: `${appUrl()}/pricing`,
        }),
      });
      sent += 1;
    } catch (err) {
      await prisma.emailSequenceEvent
        .delete({ where: { userId_sequence: { userId: user.id, sequence: key } } })
        .catch(() => undefined);
      console.error("[hub-points] expiry warning failed", user.id, err);
    }
  }
  return sent;
}

export async function runHubPointsMaintenance() {
  try {
    const stale = await prisma.user.findMany({
      where: {
        hubPointsBalance: { gt: 0 },
        hubPointsLastActivityAt: {
          lt: new Date(Date.now() - HUB_POINTS_EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: { id: true },
      take: 100,
    });

    let expired = 0;
    for (const row of stale) {
      if (await expireInactiveHubPointsForUser(row.id)) expired += 1;
    }
    const warnings = await sendHubPointsExpiryWarnings();
    return { expired, warnings };
  } catch (err) {
    console.error("[hub-points] maintenance failed", err);
    return { expired: 0, warnings: 0 };
  }
}

export async function ensureHubPointsFresh(userId: string) {
  await expireInactiveHubPointsForUser(userId).catch(() => undefined);
}
