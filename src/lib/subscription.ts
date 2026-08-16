import { prisma } from "@/lib/prisma";
import type { Role, SubscriptionPlan } from "@/lib/types";

const ACTIVE = new Set(["ACTIVE", "TRIALING"]);

export async function hasActivePlan(userId: string, plan: SubscriptionPlan) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, plan, status: { in: ["ACTIVE", "TRIALING"] } },
  });
  return Boolean(sub);
}

export async function hasAnyActivePlan(userId: string, plans: SubscriptionPlan[]) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, plan: { in: plans }, status: { in: ["ACTIVE", "TRIALING"] } },
  });
  return Boolean(sub);
}

/** Students need Student Pass; tutors need Tutor Basic (or verified which implies paid presence). */
export async function canMessage(userId: string, role: Role) {
  if (role === "ADMIN") return true;
  if (role === "STUDENT") return hasActivePlan(userId, "STUDENT_PASS");
  if (role === "TUTOR") {
    return hasAnyActivePlan(userId, ["TUTOR_BASIC", "VERIFIED_TUTOR"]);
  }
  return false;
}

export async function canPostAd(userId: string, role: Role) {
  if (role === "ADMIN") return true;
  if (role === "STUDENT") return hasActivePlan(userId, "STUDENT_PASS");
  return false;
}

export async function syncTutorBadges(userId: string) {
  const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (!profile) return;

  const subs = await prisma.subscription.findMany({
    where: { userId, status: { in: ["ACTIVE", "TRIALING"] } },
  });
  const plans = new Set(subs.map((s) => s.plan));
  await prisma.tutorProfile.update({
    where: { id: profile.id },
    data: {
      verified: plans.has("VERIFIED_TUTOR"),
      highlighted: plans.has("HIGHLIGHTED_AD"),
      active: plans.has("TUTOR_BASIC") || plans.has("VERIFIED_TUTOR") || plans.has("HIGHLIGHTED_AD"),
    },
  });
}

export function isSubscriptionActive(status: string) {
  return ACTIVE.has(status);
}
