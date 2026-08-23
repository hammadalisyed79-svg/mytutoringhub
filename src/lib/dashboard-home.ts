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
  tab?: string;
};

import { getTutorProfileCompletion, isTutorProfileComplete } from "@/lib/tutor-profile-completion";

export function profileStrength(
  tp: {
    photoUrl: string | null;
    bio: string | null;
    subjects: string | null;
    headline?: string | null;
    country?: string | null;
    location?: string | null;
    hourlyRate: number;
    online?: boolean;
    inPerson?: boolean;
    qualifications: string | null;
    availability: string | null;
  },
  name?: string | null,
) {
  const completion = getTutorProfileCompletion({
    name,
    photoUrl: tp.photoUrl,
    headline: tp.headline,
    bio: tp.bio,
    country: tp.country,
    location: tp.location,
    subjects: tp.subjects,
    hourlyRate: tp.hourlyRate,
    online: tp.online,
    inPerson: tp.inPerson,
    qualifications: tp.qualifications,
  });
  const recommended = [
    !tp.availability?.trim() && "availability",
  ].filter(Boolean) as string[];
  const pct = Math.round(
    ((completion.requiredDone + (recommended.length === 0 ? 1 : 0)) /
      (completion.requiredTotal + 1)) *
      100,
  );
  return { pct, missing: [...completion.missingRequired, ...recommended] };
}

export function dashboardQueryString(sp: DashboardSearchParams) {
  const q = new URLSearchParams();
  for (const key of ["checkout", "subscribed", "plan", "state", "verify", "verified", "tab"] as const) {
    const value = sp[key];
    if (value) q.set(key, value);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export type TutorDashboardTab = "growth" | "profile";

export function tutorDashboardTabHref(
  sp: DashboardSearchParams,
  tab: TutorDashboardTab,
  hash?: string,
) {
  const q = new URLSearchParams();
  for (const key of ["checkout", "subscribed", "plan", "state", "verify", "verified"] as const) {
    const value = sp[key];
    if (value) q.set(key, value);
  }
  if (tab === "profile" || tab === "growth") q.set("tab", tab);
  const query = q.toString();
  const base = `/dashboard/tutor${query ? `?${query}` : ""}`;
  return hash ? `${base}#${hash}` : base;
}

export function resolveTutorDashboardTab(
  sp: DashboardSearchParams,
  profileComplete: boolean,
): TutorDashboardTab {
  if (sp.tab === "profile" || sp.tab === "growth") return sp.tab;
  return profileComplete ? "growth" : "profile";
}

export function isTutorDashboardProfileComplete(
  tp: Parameters<typeof profileStrength>[0],
  name?: string | null,
) {
  return isTutorProfileComplete({
    name,
    photoUrl: tp.photoUrl,
    headline: tp.headline,
    bio: tp.bio,
    country: tp.country,
    location: tp.location,
    subjects: tp.subjects,
    hourlyRate: tp.hourlyRate,
    online: tp.online,
    inPerson: tp.inPerson,
    qualifications: tp.qualifications,
  });
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
