import assert from "node:assert/strict";
import {
  encodeTeachingProfileContextMessage,
  lastContextListingId,
  parseTeachingProfileContextMessage,
  teachingProfileContextLine,
  teachingProfileThreadContext,
  withRegardingPreface,
} from "./message-listing-context";

const listing = {
  id: "sp1",
  subject: "Mathematics",
  title: "Cambridge A Level Maths",
  rate: 2500,
  level: "All levels",
  board: null as string | null,
  capabilities: [
    { kind: "BOARD", value: "Cambridge" },
    { kind: "LEVEL", value: "A Level" },
    { kind: "SYLLABUS_CODE", value: "9709" },
  ],
};

const line = teachingProfileContextLine(listing);
assert.match(line, /Mathematics/);
assert.match(line, /Cambridge/);
assert.match(line, /9709/);
assert.match(line, /2500 PKR\/hr/);

const ctx = teachingProfileThreadContext(listing);
assert.equal(ctx.href, "/listings/sp1");
assert.equal(ctx.listingId, "sp1");

const encoded = encodeTeachingProfileContextMessage(ctx);
const parsed = parseTeachingProfileContextMessage(encoded);
assert.equal(parsed?.listingId, "sp1");
assert.equal(parsed?.line, ctx.line);
assert.equal(parseTeachingProfileContextMessage("Hello there"), null);

assert.equal(lastContextListingId([{ body: "hi" }, { body: encoded }]), "sp1");

const prefaced = withRegardingPreface("I need exam prep", ctx);
assert.match(prefaced, /^Regarding:/);
assert.match(prefaced, /I need exam prep/);

console.log("message-listing-context.test.ts: ok");
