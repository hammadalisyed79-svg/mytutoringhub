/**
 * Tutor-facing profile visibility status.
 * Built only on `getTutorProfileCompletion` + `computeDesiredTutorPublicActive`.
 * Does not invent a second completeness model.
 */
import {
  computeDesiredTutorPublicActive,
  type TutorVisibilityInput,
} from "@/lib/tutor-public-eligibility";
import { getTutorProfileCompletion } from "@/lib/tutor-profile-completion";

export type TutorFacingStatus = "LIVE" | "INCOMPLETE" | "SUSPENDED";

export type TutorProfileStatusView = {
  status: TutorFacingStatus;
  title: string;
  summary: string;
  /** 0–100 from listing gates (required profile fields + email verification). */
  percent: number;
  stepsRemaining: number;
  checks: Array<{ key: string; label: string; ok: boolean; required: boolean }>;
  missingLabels: string[];
  /** True when DB says active and account is not suspended. */
  isLiveInSearch: boolean;
  suspiciousName: boolean;
  emailVerified: boolean;
  complete: boolean;
  cta: { label: string; href: string } | null;
  secondaryCta: { label: string; href: string } | null;
};

export type TutorProfileStatusInput = TutorVisibilityInput & {
  profileId?: string | null;
  /** Actual DB flag after syncTutorBadges — source of truth for LIVE. */
  active?: boolean;
  suspended?: boolean;
};

function humanMissingFromEligibility(input: TutorVisibilityInput): string[] {
  const assessment = computeDesiredTutorPublicActive(input);
  const labels: string[] = [];
  if (!assessment.emailVerified) labels.push("Verify your email");
  if (assessment.suspiciousName) {
    labels.push("Use a clear personal name (not a placeholder or promotional name)");
  }
  for (const label of assessment.missingRequired) {
    labels.push(label);
  }
  return labels;
}

/**
 * Percent and checklist for tutor UI — email verification is a live gate
 * alongside canonical profile completion fields.
 */
export function buildTutorProfileStatus(input: TutorProfileStatusInput): TutorProfileStatusView {
  const suspended = Boolean(input.suspended);
  const assessment = computeDesiredTutorPublicActive(input);
  const completion = getTutorProfileCompletion(input);
  const isLiveInSearch = Boolean(input.active) && !suspended;

  const checks: TutorProfileStatusView["checks"] = [
    {
      key: "email",
      label: "Email verified",
      ok: assessment.emailVerified,
      required: true,
    },
    ...completion.checks.map((row) => ({
      key: row.key,
      label: row.label,
      ok: row.ok,
      required: row.required,
    })),
  ];

  if (assessment.suspiciousName) {
    checks.push({
      key: "name_quality",
      label: "Clear personal name",
      ok: false,
      required: true,
    });
  }

  const requiredTotal = checks.filter((c) => c.required).length;
  const requiredDone = checks.filter((c) => c.required && c.ok).length;
  const percent = requiredTotal === 0 ? 0 : Math.round((requiredDone / requiredTotal) * 100);
  const missingLabels = humanMissingFromEligibility(input);
  const stepsRemaining = checks.filter((c) => c.required && !c.ok).length;

  const profileHref = input.profileId ? `/tutors/${input.profileId}` : null;
  const editHref = "/dashboard/tutor?tab=profile#tutor-profile";

  if (suspended) {
    return {
      status: "SUSPENDED",
      title: "Account suspended",
      summary: "Your tutor profile is not visible while this account is suspended.",
      percent,
      stepsRemaining,
      checks,
      missingLabels: [],
      isLiveInSearch: false,
      suspiciousName: assessment.suspiciousName,
      emailVerified: assessment.emailVerified,
      complete: completion.complete,
      cta: null,
      secondaryCta: null,
    };
  }

  if (isLiveInSearch) {
    return {
      status: "LIVE",
      title: "Your profile is live",
      summary: "Your profile is visible to students in tutor search.",
      percent: 100,
      stepsRemaining: 0,
      checks,
      missingLabels: [],
      isLiveInSearch: true,
      suspiciousName: assessment.suspiciousName,
      emailVerified: assessment.emailVerified,
      complete: completion.complete,
      cta: profileHref ? { label: "View public profile", href: profileHref } : null,
      secondaryCta: { label: "Improve profile", href: editHref },
    };
  }

  // Hidden — never claim LIVE from a paid plan alone.
  const summary =
    stepsRemaining === 0 && assessment.suspiciousName
      ? "Update the name students see before your profile can appear in search."
      : stepsRemaining === 1
        ? "1 step remaining before your profile can go live."
        : `${stepsRemaining} steps remaining before your profile goes live.`;

  return {
    status: "INCOMPLETE",
    title: "Your tutor profile",
    summary,
    percent,
    stepsRemaining,
    checks,
    missingLabels,
    isLiveInSearch: false,
    suspiciousName: assessment.suspiciousName,
    emailVerified: assessment.emailVerified,
    complete: completion.complete,
    cta: { label: "Complete my profile", href: editHref },
    secondaryCta: profileHref ? { label: "Preview my public profile", href: profileHref } : null,
  };
}
