import { prisma } from "@/lib/prisma";
import { sendEmail, subscriptionEmailHtml } from "@/lib/email";
import { syncTutorBadges } from "@/lib/subscription";
import type { ResolvedPlan } from "@/lib/plans";
import type { SubscriptionPlan } from "@/lib/types";

export async function grantComplimentaryPlan(opts: {
  userId: string;
  plan: ResolvedPlan;
}) {
  const now = new Date();
  const periodEnd = opts.plan.promoEndsAt || new Date(now.getTime() + 30 * 86400000);
  const existing = await prisma.subscription.findFirst({
    where: {
      userId: opts.userId,
      plan: opts.plan.id,
      status: { in: ["ACTIVE", "TRIALING"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    const end =
      existing.currentPeriodEnd && existing.currentPeriodEnd > periodEnd
        ? existing.currentPeriodEnd
        : periodEnd;
    const updated = await prisma.subscription.update({
      where: { id: existing.id },
      data: { status: "ACTIVE", currentPeriodEnd: end, stripePriceId: "promo_complimentary" },
    });
    return { subscription: updated, alreadyActive: true };
  }

  const created = await prisma.subscription.create({
    data: {
      userId: opts.userId,
      plan: opts.plan.id as SubscriptionPlan,
      status: "ACTIVE",
      currentPeriodEnd: periodEnd,
      stripeSubscriptionId: `promo_${opts.plan.id}_${opts.userId}_${Date.now()}`,
      stripePriceId: "promo_complimentary",
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { email: true, name: true, role: true },
  });
  if (user?.role === "TUTOR") {
    await syncTutorBadges(opts.userId);
  }
  if (user?.email) {
    await sendEmail({
      to: user.email,
      subject: `${opts.plan.name} is complimentary until ${periodEnd.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })}`,
      html: subscriptionEmailHtml(opts.plan.name, true),
    }).catch((err) => console.error("[email] complimentary plan failed", err));
  }

  return { subscription: created, alreadyActive: false };
}
