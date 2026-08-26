/**
 * Admin-triggered Recovery Email 1 (tutor_profile_r1).
 * Re-runs canonical recovery audience at execution; never sends without confirm.
 */
import { prisma } from "@/lib/prisma";
import { selectTutorRecoveryAudience } from "@/lib/tutor-recovery-audience";
import {
  NURTURE_SEQUENCES,
  sendTutorProfileReminderEmail,
} from "@/lib/email-nurture";
import { emailConfigured } from "@/lib/email";
import { recoveryEmailStageCopy } from "@/lib/tutor-recovery-campaign";

export type RecoveryEmail1SendSummary = {
  ok: true;
  eligibleAtExecution: number;
  sent: number;
  alreadyReceived: number;
  becameIneligible: number;
  failed: number;
  failureCount: number;
};

export type ReminderSendOutcome = "sent" | "alreadyReceived" | "becameIneligible" | "failed";

/** Classify a single recipient outcome (unit-tested). */
export function classifyReminderResult(
  hadR1Before: boolean,
  result: { sent: boolean; reason?: string },
): ReminderSendOutcome {
  if (hadR1Before) return "alreadyReceived";
  if (result.sent) return "sent";
  if (result.reason === "already_sent") return "alreadyReceived";
  if (
    result.reason === "ineligible" ||
    result.reason === "complete" ||
    result.reason === "not_started"
  ) {
    return "becameIneligible";
  }
  return "failed";
}

export type RecoveryEmail1Preview = {
  eligibleCount: number;
  excluded: {
    suspiciousName: number;
    unverifiedEmail: number;
    suspended: number;
    alreadyLive: number;
    completeButHidden: number;
    neverStarted: number;
  };
  email: ReturnType<typeof recoveryEmailStageCopy>;
};

export async function getRecoveryEmail1Preview(): Promise<RecoveryEmail1Preview> {
  const audience = await selectTutorRecoveryAudience({ limit: 500 });
  return {
    eligibleCount: audience.eligibleCount,
    excluded: audience.excluded,
    email: recoveryEmailStageCopy(1),
  };
}

export async function sendRecoveryEmail1Campaign(): Promise<RecoveryEmail1SendSummary> {
  if (!emailConfigured()) {
    throw new Error(
      "Email is not configured. Add RESEND_API_KEY before sending recovery Email 1.",
    );
  }

  const audience = await selectTutorRecoveryAudience({ limit: 500 });
  const eligibleAtExecution = audience.eligibleCount;

  const userIds = audience.rows.map((r) => r.userId);
  const alreadySentRows =
    userIds.length === 0
      ? []
      : await prisma.emailSequenceEvent.findMany({
          where: {
            userId: { in: userIds },
            sequence: NURTURE_SEQUENCES.TUTOR_PROFILE_R1,
          },
          select: { userId: true },
        });
  const alreadySentSet = new Set(alreadySentRows.map((r) => r.userId));

  let sent = 0;
  let alreadyReceived = 0;
  let becameIneligible = 0;
  let failed = 0;

  for (const row of audience.rows) {
    const hadR1 = alreadySentSet.has(row.userId);

    try {
      const result = hadR1
        ? { sent: false as const, reason: "already_sent" as const }
        : await sendTutorProfileReminderEmail(row.userId, 1);
      const outcome = classifyReminderResult(hadR1, result);
      if (outcome === "sent") sent += 1;
      else if (outcome === "alreadyReceived") alreadyReceived += 1;
      else if (outcome === "becameIneligible") becameIneligible += 1;
      else failed += 1;
    } catch (err) {
      console.error("[recovery-email-1] send failed", row.userId, err);
      failed += 1;
    }
  }

  return {
    ok: true,
    eligibleAtExecution,
    sent,
    alreadyReceived,
    becameIneligible,
    failed,
    failureCount: failed,
  };
}
