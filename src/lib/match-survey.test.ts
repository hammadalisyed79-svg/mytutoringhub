import assert from "node:assert/strict";
import {
  matchSurveyEventName,
  matchSurveyQuestion,
  shouldOfferMatchSurvey,
} from "@/lib/match-survey";

assert.equal(
  shouldOfferMatchSurvey({ messageCount: 3, distinctSenderCount: 2, alreadyResponded: false }),
  false,
);
assert.equal(
  shouldOfferMatchSurvey({ messageCount: 4, distinctSenderCount: 1, alreadyResponded: false }),
  false,
);
assert.equal(
  shouldOfferMatchSurvey({ messageCount: 4, distinctSenderCount: 2, alreadyResponded: false }),
  true,
);
assert.equal(
  shouldOfferMatchSurvey({ messageCount: 10, distinctSenderCount: 2, alreadyResponded: true }),
  false,
);
assert.equal(matchSurveyQuestion("STUDENT").includes("find a tutor"), true);
assert.equal(matchSurveyQuestion("TUTOR").includes("tutoring opportunity"), true);
assert.equal(matchSurveyEventName("STUDENT"), "successful_match_student_response");
assert.equal(matchSurveyEventName("TUTOR"), "successful_match_tutor_response");

console.log("match-survey.test.ts: ok");
