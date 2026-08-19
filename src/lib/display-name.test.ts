import assert from "node:assert/strict";
import {
  isPlaceholderDisplayName,
  normalizeDisplayName,
  oauthUserDisplayName,
  parseDisplayNameInput,
  resolveOAuthDisplayName,
} from "./display-name";

assert.equal(normalizeDisplayName("  Jane   Doe  "), "Jane Doe");
assert.equal(normalizeDisplayName("A"), null);
assert.equal(normalizeDisplayName(""), null);
assert.equal(normalizeDisplayName("x".repeat(81)), null);
assert.equal(normalizeDisplayName("Jo"), "Jo");

const parsedOk = parseDisplayNameInput("  Ada   Lovelace ");
assert.equal(parsedOk.ok, true);
if (parsedOk.ok) assert.equal(parsedOk.name, "Ada Lovelace");
const parsedBad = parseDisplayNameInput("A");
assert.equal(parsedBad.ok, false);

assert.equal(resolveOAuthDisplayName({ name: "Priya Khan" }), "Priya Khan");
assert.equal(
  resolveOAuthDisplayName({ given_name: "Priya", family_name: "Khan" }),
  "Priya Khan",
);
assert.equal(resolveOAuthDisplayName({ name: "  ", given_name: "Alex" }), "Alex");
assert.equal(resolveOAuthDisplayName({ givenName: "Sam", familyName: "Lee" }), "Sam Lee");
assert.equal(resolveOAuthDisplayName({}), null);

assert.equal(isPlaceholderDisplayName("jane.doe", "jane.doe@gmail.com"), true);
assert.equal(isPlaceholderDisplayName("jane.doe@gmail.com", "jane.doe@gmail.com"), true);
assert.equal(isPlaceholderDisplayName("Jane Doe", "jane.doe@gmail.com"), false);
assert.equal(isPlaceholderDisplayName("  ", "jane.doe@gmail.com"), true);

assert.equal(
  oauthUserDisplayName({
    email: "jane.doe@gmail.com",
    oauthName: "Jane Doe",
    isNewUser: true,
  }),
  "Jane Doe",
);
assert.equal(
  oauthUserDisplayName({
    email: "jane.doe@gmail.com",
    oauthName: null,
    isNewUser: true,
  }),
  "jane.doe",
);
assert.equal(
  oauthUserDisplayName({
    existingName: "Custom Tutor",
    email: "jane.doe@gmail.com",
    oauthName: "Jane Doe",
    isNewUser: false,
  }),
  "Custom Tutor",
);
assert.equal(
  oauthUserDisplayName({
    existingName: "jane.doe",
    email: "jane.doe@gmail.com",
    oauthName: "Jane Doe",
    isNewUser: false,
  }),
  "Jane Doe",
);
assert.equal(
  oauthUserDisplayName({
    existingName: "Jane Doe",
    email: "jane.doe@gmail.com",
    oauthName: "Jane From Google",
    isNewUser: false,
  }),
  "Jane Doe",
);

console.log("display-name tests passed");
