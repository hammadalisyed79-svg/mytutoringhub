import assert from "node:assert/strict";
import {
  expandSubjectTerms,
  parseSearchQuery,
  resolveCity,
  resolveCountry,
  resolveSubjectName,
  suggestCities,
  suggestCountries,
} from "./search-smart";
import {
  citiesForSearchCountry,
  cityBelongsToCountry,
  inferTutorCountry,
} from "./tutor-catalog";

assert.equal(resolveCountry("US").value, "United States");
assert.equal(resolveCountry("uk").value, "United Kingdom");
assert.equal(resolveCountry("Pakistan").matched, true);
assert.equal(resolveCountry("or").matched, false);

assert.equal(resolveCity("NYC").value, "New York");
assert.equal(resolveCity("nyc", citiesForSearchCountry("Pakistan")).matched, false);
assert.equal(resolveCity("Lahore", citiesForSearchCountry("Pakistan")).value, "Lahore");

const pakistanCities = suggestCities("", 20, citiesForSearchCountry("Pakistan"));
assert.equal(pakistanCities[0], "Online");
assert.ok(pakistanCities.includes("Karachi"));
assert.ok(pakistanCities.includes("Rawalpindi"));
assert.ok(!pakistanCities.includes("New York"));

const countries = suggestCountries("pak", 8);
assert.ok(countries.includes("Pakistan"));

assert.equal(inferTutorCountry("New York"), "United States");
assert.equal(inferTutorCountry("Rawalpindi"), "Pakistan");
assert.equal(cityBelongsToCountry("Lahore", "Pakistan"), true);
assert.equal(cityBelongsToCountry("New York", "Pakistan"), false);
assert.equal(cityBelongsToCountry("Online", "Pakistan"), true);

const parsed = parseSearchQuery("Physics New York");
assert.equal(parsed.subject, "Physics");
assert.equal(parsed.location, "New York");

assert.equal(resolveSubjectName("Business").value, "Business");
assert.equal(resolveSubjectName("Business Studies").value, "Business Studies");
{
  const terms = expandSubjectTerms("Business").map((t) => t.toLowerCase());
  assert.ok(terms.includes("business"));
  assert.ok(terms.includes("business studies"));
  assert.ok(terms.includes("commerce"));
  const studies = expandSubjectTerms("Business Studies").map((t) => t.toLowerCase());
  assert.ok(studies.includes("business"));
}

console.log("search-smart country/city tests passed");
