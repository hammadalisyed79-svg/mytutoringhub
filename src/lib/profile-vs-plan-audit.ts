/**
 * Marketplace Teaching Profile vs plan audit (read-only inventory).
 * Free=1 / Pro=10; Free over-cap rows are inventory failures after enforce (not grandfathered).
 */
import { prisma } from "@/lib/prisma";
import {
  FREE_SUBJECT_PROFILES,
  TUTOR_PRO_SUBJECT_PROFILE_CAP,
  getSubjectProfileActiveCap,
} from "@/lib/subject-profile-entitlements";

export type ProfileVsPlanRow = {
  userId: string;
  tutorProfileId: string;
  planCap: number;
  activeCount: number;
  bucket:
    | "ok"
    | "pro_over_cap"
    | "free_grandfather_over_cap"
    | "expired_pro_over_free"
    | "zero_active";
};

export type ProfileVsPlanAudit = {
  generatedAt: string;
  totals: {
    tutorsWithActiveListings: number;
    ok: number;
    proOverCap: number;
    freeGrandfatherOverCap: number;
    expiredProStyleOverFree: number;
    zeroActiveSkipped: number;
  };
  samples: ProfileVsPlanRow[];
  businessCaps: { free: number; tutorPro: number };
};

function bucketFor(planCap: number, activeCount: number): ProfileVsPlanRow["bucket"] {
  if (activeCount <= 0) return "zero_active";
  if (!Number.isFinite(planCap)) return "ok";
  if (activeCount <= planCap) return "ok";
  if (planCap >= TUTOR_PRO_SUBJECT_PROFILE_CAP) return "pro_over_cap";
  // Free / Extra Active path: excess ACTIVE is grandfathered. Heavy excess often = expired Pro.
  if (planCap <= FREE_SUBJECT_PROFILES && activeCount > 3) return "expired_pro_over_free";
  return "free_grandfather_over_cap";
}

/** Classify tutors with ACTIVE Teaching Profiles against their live plan cap. */
export async function auditProfileVsPlan(opts?: {
  sampleLimit?: number;
  now?: Date;
}): Promise<ProfileVsPlanAudit> {
  const now = opts?.now ?? new Date();
  const sampleLimit = opts?.sampleLimit ?? 40;
  const tutors = await prisma.tutorProfile.findMany({
    where: { subjectProfiles: { some: { status: "ACTIVE" } } },
    select: { id: true, userId: true },
  });

  const totals = {
    tutorsWithActiveListings: tutors.length,
    ok: 0,
    proOverCap: 0,
    freeGrandfatherOverCap: 0,
    expiredProStyleOverFree: 0,
    zeroActiveSkipped: 0,
  };
  const samples: ProfileVsPlanRow[] = [];

  for (const tutor of tutors) {
    const [planCap, activeCount] = await Promise.all([
      getSubjectProfileActiveCap(tutor.userId, now),
      prisma.subjectProfile.count({
        where: { tutorProfileId: tutor.id, status: "ACTIVE" },
      }),
    ]);

    const bucket = bucketFor(planCap, activeCount);

    if (bucket === "ok") totals.ok += 1;
    else if (bucket === "pro_over_cap") totals.proOverCap += 1;
    else if (bucket === "free_grandfather_over_cap") totals.freeGrandfatherOverCap += 1;
    else if (bucket === "expired_pro_over_free") totals.expiredProStyleOverFree += 1;
    else totals.zeroActiveSkipped += 1;

    if (bucket !== "ok" && samples.length < sampleLimit) {
      samples.push({
        userId: tutor.userId,
        tutorProfileId: tutor.id,
        planCap: Number.isFinite(planCap) ? planCap : -1,
        activeCount,
        bucket,
      });
    }
  }

  return {
    generatedAt: now.toISOString(),
    totals,
    samples,
    businessCaps: { free: FREE_SUBJECT_PROFILES, tutorPro: TUTOR_PRO_SUBJECT_PROFILE_CAP },
  };
}

/** Hard failures only — Pro over-cap should be 0 after enforce. Grandfather Free excess is OK. */
export function profileVsPlanHardFailures(audit: ProfileVsPlanAudit) {
  return {
    proOverCap: audit.totals.proOverCap,
    ok: audit.totals.proOverCap === 0,
  };
}
