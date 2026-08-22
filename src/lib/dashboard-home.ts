import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  reconcileUserSafepayPaperPurchases,
  reconcileUserSafepayPayments,
} from "@/lib/safepay-complete";
import { syncTutorBadges, uniqueVisibleSubscriptions } from "@/lib/subscription";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { catalogSubjectNames, mergeSubjectNames } from "@/lib/subject-catalog";
import { curriculumLevels } from "@/lib/curriculum";
import type { Role } from "@/lib/types";

export type DashboardSearchParams = {
  checkout?: string;
  subscribed?: string;
  plan?: string;
  state?: string;
  verify?: string;
  verified?: string;
};

export function profileStrength(tp: {
  photoUrl: string | null;
  bio: string | null;
  subjects: string | null;
  qualifications: string | null;
  hourlyRate: number;
  availability: string | null;
}) {
  const missing = [
    !tp.photoUrl && "photo",
    !tp.bio?.trim() && "bio",
    !tp.subjects?.trim() && "subjects",
    !tp.qualifications?.trim() && "qualifications",
    !(tp.hourlyRate > 0) && "hourly rate",
    !tp.availability?.trim() && "availability",
  ].filter(Boolean) as string[];
  const total = 6;
  const done = total - missing.length;
  return { pct: Math.round((done / total) * 100), missing };
}

export function dashboardQueryString(sp: DashboardSearchParams) {
  const q = new URLSearchParams();
  for (const key of ["checkout", "subscribed", "plan", "state", "verify", "verified"] as const) {
    const value = sp[key];
    if (value) q.set(key, value);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function roleDashboardPath(role: Role, sp: DashboardSearchParams = {}) {
  if (role === "ADMIN") return "/admin";
  const base = role === "TUTOR" ? "/dashboard/tutor" : "/dashboard/student";
  return `${base}${dashboardQueryString(sp)}`;
}

/** Reconcile payments / badges, then load the signed-in user for a role home. */
export async function prepareDashboardHome(userId: string, role: Role, sp: DashboardSearchParams) {
  const [justActivated, currency] = await Promise.all([
    reconcileUserSafepayPayments(userId),
    getVisitorCurrency(),
    reconcileUserSafepayPaperPurchases(userId),
  ]);
  if (role === "TUTOR") {
    await syncTutorBadges(userId);
  }
  if (justActivated[0] && !sp.checkout) {
    redirect(`/receipt/${justActivated[0]}`);
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      subscriptions: { orderBy: { createdAt: "desc" } },
      tutorProfile: true,
      studentAds: { orderBy: { createdAt: "desc" }, take: 5 },
      reviewRequestsRecv: {
        where: { status: "PENDING" },
        include: { tutorUser: { select: { name: true } } },
        take: 10,
      },
    },
  });

  const dbSubjects = (
    await prisma.subject.findMany({ orderBy: { name: "asc" }, select: { name: true } })
  ).map((row) => row.name);
  const catalogSubjects = mergeSubjectNames(dbSubjects, catalogSubjectNames());

  const visibleSubs = uniqueVisibleSubscriptions(user.subscriptions);
  const pendingSubs = user.subscriptions.filter((s) => s.status === "INCOMPLETE");
  const isTutor = user.role === "TUTOR";
  const corePlan = isTutor
    ? visibleSubs.find((s) => s.plan === "TUTOR_BASIC" || s.plan === "VERIFIED_TUTOR")
    : visibleSubs.find((s) => s.plan === "STUDENT_PASS" || s.plan === "STUDENT_PRO");
  const addOnSubs = isTutor ? visibleSubs.filter((s) => s.plan !== "TUTOR_BASIC") : [];

  return {
    user,
    currency,
    catalogSubjects,
    extraLevels: curriculumLevels(),
    visibleSubs,
    pendingSubs,
    corePlan,
    addOnSubs,
  };
}
