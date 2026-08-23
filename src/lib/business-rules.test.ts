import assert from "node:assert/strict";
import { isSuspiciousDisplayName, parseDisplayNameInput } from "@/lib/display-name";
import { BUSINESS, findTutorCtaCopy } from "@/lib/business-rules";

assert.equal(isSuspiciousDisplayName("★★★★★"), true);
assert.equal(isSuspiciousDisplayName("http://spam.com"), true);
assert.equal(isSuspiciousDisplayName("!!!!@@@@"), true);
assert.equal(isSuspiciousDisplayName("Ayesha Khan"), false);
assert.equal(isSuspiciousDisplayName("محمد أحمد"), false);
assert.equal(isSuspiciousDisplayName("José García"), false);

const bad = parseDisplayNameInput("www.spam.com tutor");
assert.equal(bad.ok, false);

const good = parseDisplayNameInput("Sara Ahmed");
assert.equal(good.ok, true);

assert.equal(BUSINESS.studentFreeContactsPerMonth, 3);
assert.ok(findTutorCtaCopy("Business").includes("3 new tutors"));
assert.ok(!findTutorCtaCopy("Business").includes("message with Student Pass"));

console.log("display-name + business-rules tests: ok");
