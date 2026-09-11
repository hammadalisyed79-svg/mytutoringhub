/**
 * Optional, non-nagging match-proxy survey helpers.
 * No PII; answers are YES / NO / SKIP only.
 */

export type MatchSurveyAnswer = "YES" | "NO" | "SKIP";

export function shouldOfferMatchSurvey(opts: {
  messageCount: number;
  distinctSenderCount: number;
  alreadyResponded: boolean;
}): boolean {
  if (opts.alreadyResponded) return false;
  return opts.messageCount >= 4 && opts.distinctSenderCount >= 2;
}

export function matchSurveyQuestion(role: string): string {
  if (role === "TUTOR") {
    return "Did this conversation become a tutoring opportunity?";
  }
  return "Did you find a tutor through this conversation?";
}

export function matchSurveyEventName(
  role: string,
): "successful_match_student_response" | "successful_match_tutor_response" {
  return role === "TUTOR"
    ? "successful_match_tutor_response"
    : "successful_match_student_response";
}
