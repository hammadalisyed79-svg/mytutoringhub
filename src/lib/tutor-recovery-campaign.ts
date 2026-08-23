/**
 * Recovery campaign preparation — analysis only. Never sends email.
 */
import { prisma } from "@/lib/prisma";
import {
  selectTutorRecoveryAudience,
  type RecoveryAudienceRow,
  type RecoveryAudienceResult,
} from "@/lib/tutor-recovery-audience";
import { getTutorSupplyOverview } from "@/lib/tutor-supply-metrics";

const DEMAND_SUBJECTS = ["Chemistry", "Mathematics", "Maths", "Math"] as const;

export type CompletionBand = "nearly_complete" | "partially_complete" | "early_profile";

export type MissingRequirementKey =
  | "subjects"
  | "photo"
  | "headline"
  | "bio"
  | "qualifications"
  | "country_city"
  | "rate"
  | "lesson_type"
  | "name"
  | "other";

export type RecoveryCampaignCandidate = RecoveryAudienceRow & {
  missingCount: number;
  band: CompletionBand;
  percent: number;
  missingKeys: MissingRequirementKey[];
  hasSubjects: boolean;
  subjectList: string[];
  demandMatch: string[];
  priorityScore: number;
  priorityReasons: string[];
};

export type RecoveryCampaignPrep = {
  refreshedAt: string;
  overviewIncomplete: number;
  audience: RecoveryAudienceResult;
  bands: Record<CompletionBand, number>;
  missingAggregates: Record<MissingRequirementKey, number>;
  multipleMissing: number;
  withSubjects: number;
  withoutSubjects: number;
  openDemandBySubject: Record<string, number>;
  priorityGroup: RecoveryCampaignCandidate[];
  personalFollowUp: RecoveryCampaignCandidate[];
  candidates: RecoveryCampaignCandidate[];
  emailStages: {
    stage: 1 | 2 | 3;
    timing: string;
    subject: string;
    cta: string;
    bodyPreview: string;
  }[];
  sendStatus: "NOT SENT";
};

function splitSubjects(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function mapMissingKeys(labels: string[]): MissingRequirementKey[] {
  const keys = new Set<MissingRequirementKey>();
  for (const label of labels) {
    const l = label.toLowerCase();
    if (l.includes("subject")) keys.add("subjects");
    else if (l.includes("photo")) keys.add("photo");
    else if (l.includes("headline")) keys.add("headline");
    else if (l.includes("about") || l === "bio") keys.add("bio");
    else if (l.includes("qualification")) keys.add("qualifications");
    else if (l.includes("country") || l.includes("city")) keys.add("country_city");
    else if (l.includes("rate")) keys.add("rate");
    else if (l.includes("lesson")) keys.add("lesson_type");
    else if (l === "name") keys.add("name");
    else keys.add("other");
  }
  return [...keys];
}

function bandForMissing(missingCount: number): CompletionBand {
  if (missingCount <= 2) return "nearly_complete";
  if (missingCount <= 4) return "partially_complete";
  return "early_profile";
}

function demandMatches(subjects: string[], demand: Map<string, number>): string[] {
  const hits: string[] = [];
  for (const s of subjects) {
    if ((demand.get(s) || 0) > 0) hits.push(s);
    for (const focus of DEMAND_SUBJECTS) {
      if (s.toLowerCase() === focus.toLowerCase() && !hits.includes(s)) {
        // Still note Chemistry/Mathematics even if open ads are 0 — only if demand map says so
      }
    }
  }
  return hits;
}

function scoreCandidate(
  row: RecoveryAudienceRow,
  missingKeys: MissingRequirementKey[],
  demandHits: string[],
): { score: number; reasons: string[] } {
  const missingCount = row.missingRequired.length;
  const reasons: string[] = [];
  let score = 0;

  if (missingCount <= 2) {
    score += 50;
    reasons.push("Nearly complete (1–2 requirements)");
  } else if (missingCount <= 4) {
    score += 20;
    reasons.push("Partially complete");
  }

  if (demandHits.length) {
    score += 30 + demandHits.length * 5;
    reasons.push(`Open student demand: ${demandHits.join(", ")}`);
  }

  const chemMath = splitSubjects(row.subjects).some((s) =>
    /chemistry|mathematics|^maths?$/i.test(s),
  );
  if (chemMath) {
    score += 15;
    reasons.push("Chemistry or Mathematics subject selected");
  }

  if (row.profileStarted) {
    score += 5;
    reasons.push("Profile already started");
  }

  if (missingKeys.includes("subjects") && missingCount <= 3) {
    score += 8;
    reasons.push("Missing subjects but otherwise progressing");
  }

  return { score, reasons };
}

export function recoveryEmailStageCopy(stage: 1 | 2 | 3): {
  subject: string;
  cta: string;
  timing: string;
  bodyPreview: string;
} {
  if (stage === 1) {
    return {
      timing: "Initial outreach (Email 1)",
      subject: "Complete your My Tutoring Hub tutor profile",
      cta: "Complete my profile",
      bodyPreview:
        "Your tutor account exists, but your profile is not currently visible to students in search. Finish the remaining listing details (for example subjects, photo, or headline where still needed) so your profile can become eligible for tutor search. Completing these steps does not guarantee students immediately — it makes you eligible when all requirements are met.",
    };
  }
  if (stage === 2) {
    return {
      timing: "Reminder ~2 days after Email 1 if still incomplete",
      subject: "Finish your tutor profile on My Tutoring Hub",
      cta: "Finish my tutor profile",
      bodyPreview:
        "A short reminder: your tutor profile is still hidden from students. Completing the remaining details can make it eligible to appear in tutor search.",
    };
  }
  return {
    timing: "Final reminder ~5 days after Email 1 if still incomplete",
    subject: "Complete your My Tutoring Hub tutor profile",
    cta: "Complete my profile",
    bodyPreview:
      "Friendly final note: your listing is still not visible to students. When you are ready, complete your profile from the dashboard — there is no pressure and no threat to your account.",
  };
}

export async function prepareTutorRecoveryCampaign(): Promise<RecoveryCampaignPrep> {
  const [overview, audience, openAds] = await Promise.all([
    getTutorSupplyOverview(),
    selectTutorRecoveryAudience({ limit: 500 }),
    prisma.studentAd.findMany({
      where: { status: "OPEN" },
      select: { subject: true },
    }),
  ]);

  const demand = new Map<string, number>();
  for (const ad of openAds) {
    const s = ad.subject?.trim();
    if (!s) continue;
    demand.set(s, (demand.get(s) || 0) + 1);
  }

  const missingAggregates: Record<MissingRequirementKey, number> = {
    subjects: 0,
    photo: 0,
    headline: 0,
    bio: 0,
    qualifications: 0,
    country_city: 0,
    rate: 0,
    lesson_type: 0,
    name: 0,
    other: 0,
  };

  const bands: Record<CompletionBand, number> = {
    nearly_complete: 0,
    partially_complete: 0,
    early_profile: 0,
  };

  let multipleMissing = 0;
  let withSubjects = 0;
  let withoutSubjects = 0;

  const candidates: RecoveryCampaignCandidate[] = audience.rows.map((row) => {
    const missingCount = row.missingRequired.length;
    const band = bandForMissing(missingCount);
    bands[band] += 1;
    if (missingCount >= 2) multipleMissing += 1;

    const missingKeys = mapMissingKeys(row.missingRequired);
    for (const k of missingKeys) missingAggregates[k] += 1;

    const subjectList = splitSubjects(row.subjects);
    const hasSubjects = subjectList.length > 0;
    if (hasSubjects) withSubjects += 1;
    else withoutSubjects += 1;

    const demandMatch = demandMatches(subjectList, demand);
    const { score, reasons } = scoreCandidate(row, missingKeys, demandMatch);
    const percent = Math.round((row.requiredDone / row.requiredTotal) * 100);

    return {
      ...row,
      missingCount,
      band,
      percent,
      missingKeys,
      hasSubjects,
      subjectList,
      demandMatch,
      priorityScore: score,
      priorityReasons: reasons,
    };
  });

  candidates.sort((a, b) => b.priorityScore - a.priorityScore);

  const priorityGroup = candidates.filter(
    (c) =>
      c.band === "nearly_complete" ||
      c.demandMatch.length > 0 ||
      c.subjectList.some((s) => /chemistry|mathematics|^maths?$/i.test(s)),
  );

  // Manual follow-up: top priority, capped; always include nearly-complete + demand matches
  const personalFollowUp = candidates
    .filter(
      (c) =>
        c.band === "nearly_complete" ||
        c.demandMatch.length > 0 ||
        (c.hasSubjects && c.missingCount <= 3),
    )
    .slice(0, 12);

  const stages = [1, 2, 3] as const;
  const emailStages = stages.map((stage) => {
    const copy = recoveryEmailStageCopy(stage);
    return { stage, ...copy };
  });

  return {
    refreshedAt: new Date().toISOString(),
    overviewIncomplete: overview.incomplete,
    audience,
    bands,
    missingAggregates,
    multipleMissing,
    withSubjects,
    withoutSubjects,
    openDemandBySubject: Object.fromEntries([...demand.entries()].sort((a, b) => b[1] - a[1])),
    priorityGroup,
    personalFollowUp,
    candidates,
    emailStages,
    sendStatus: "NOT SENT",
  };
}

/** Admin-safe summary without emails or user ids. */
export function redactRecoveryCampaignForReport(prep: RecoveryCampaignPrep) {
  return {
    refreshedAt: prep.refreshedAt,
    overviewIncomplete: prep.overviewIncomplete,
    eligibleCount: prep.audience.eligibleCount,
    totalScanned: prep.audience.totalScanned,
    excluded: prep.audience.excluded,
    bands: prep.bands,
    missingAggregates: prep.missingAggregates,
    multipleMissing: prep.multipleMissing,
    withSubjects: prep.withSubjects,
    withoutSubjects: prep.withoutSubjects,
    openDemandBySubject: prep.openDemandBySubject,
    priorityGroupCount: prep.priorityGroup.length,
    personalFollowUpCount: prep.personalFollowUp.length,
    prioritySample: prep.priorityGroup.map((c) => ({
      firstName: c.name.split(/\s+/)[0] || "Tutor",
      emailDomain: c.emailDomain,
      subjects: c.subjectList.length ? c.subjectList : ["(none)"],
      percent: c.percent,
      missingRequired: c.missingRequired,
      band: c.band,
      demandMatch: c.demandMatch,
      priorityReasons: c.priorityReasons,
    })),
    personalFollowUpSample: prep.personalFollowUp.map((c) => ({
      firstName: c.name.split(/\s+/)[0] || "Tutor",
      emailDomain: c.emailDomain,
      subjects: c.subjectList.length ? c.subjectList : ["(none)"],
      percent: c.percent,
      missingRequired: c.missingRequired,
      demandMatch: c.demandMatch,
    })),
    emailStages: prep.emailStages,
    sendStatus: prep.sendStatus,
  };
}
