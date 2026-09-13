import assert from "node:assert/strict";
import {
  regionalLanguagesForCountry,
  searchLanguagesForCountry,
  tutorLanguageOptions,
  TUTOR_CORE_LANGUAGES,
} from "@/lib/tutor-catalog";

// Pakistan / default: South Asian regional priority
const pk = tutorLanguageOptions("Pakistan");
assert.ok(pk.core.includes("Urdu"));
assert.ok(pk.core.includes("Punjabi"));
assert.ok(pk.core[0] === "English");
assert.ok(pk.more.includes("French"));
assert.ok(!pk.core.includes("French"));

// Germany: German priority, French as preference
const de = tutorLanguageOptions("Germany");
assert.ok(de.core.includes("German"));
assert.ok(de.core.includes("English"));
assert.ok(de.more.includes("Spanish") || de.core.includes("Spanish") === false);
assert.ok(de.more.some((l) => l === "French" || l === "Spanish"));

// UAE: Arabic priority
const ae = tutorLanguageOptions("United Arab Emirates");
assert.ok(ae.core.includes("Arabic"));
assert.ok(ae.core.includes("Urdu"));

// Unknown country falls back to default core set
const fallback = regionalLanguagesForCountry("");
assert.deepEqual(fallback, [...TUTOR_CORE_LANGUAGES]);

// Search suggest keeps regional before international
const searchPk = searchLanguagesForCountry("Pakistan");
assert.ok(searchPk.indexOf("Urdu") < searchPk.indexOf("French"));
assert.ok(searchPk.indexOf("English") < searchPk.indexOf("Spanish"));

console.log("tutor-catalog.languages.test.ts: ok");
