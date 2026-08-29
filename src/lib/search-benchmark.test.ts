import assert from "node:assert/strict";
import {
  assertBoostBelowAcademicRelevance,
  SEARCH_BENCHMARK_CASES,
  SEARCH_RANK_WEIGHTS,
} from "./search-benchmark";
import { parseSearchQuery, resolveCity, suggestCities } from "./search-smart";
import { citiesForSearchCountry } from "./tutor-catalog";

assert.equal(assertBoostBelowAcademicRelevance(), true);
assert.ok(SEARCH_RANK_WEIGHTS.boost < SEARCH_RANK_WEIGHTS.subject);
assert.ok(SEARCH_RANK_WEIGHTS.boost < SEARCH_RANK_WEIGHTS.syllabusCode);

const pk = citiesForSearchCountry("Pakistan");
assert.equal(pk[0], "Online");
assert.ok(pk.indexOf("Rawalpindi") > 0 && pk.indexOf("Rawalpindi") < 8);
assert.ok(pk.indexOf("Karachi") < pk.indexOf("Rawalpindi"));

for (const c of SEARCH_BENCHMARK_CASES) {
  if (c.expect.kind === "city_in_suggestions") {
    const cities = suggestCities("", c.expect.minSuggestionLimit || 20, citiesForSearchCountry(c.expect.country!));
    assert.ok(cities.includes(c.expect.city!), `${c.id} missing ${c.expect.city}`);
  }
  if (c.expect.kind === "parse" && c.query.location && c.expect.parsedLocation) {
    if (c.id === "alias-rwp") {
      assert.equal(resolveCity(c.query.location, citiesForSearchCountry("Pakistan")).value, "Rawalpindi");
    } else if (c.id === "parse-physics-ny") {
      const parsed = parseSearchQuery("Physics New York");
      assert.equal(parsed.subject, c.expect.parsedSubject);
      assert.equal(parsed.location, c.expect.parsedLocation);
    } else if (c.id === "city-lahore") {
      assert.equal(resolveCity("Lahore", citiesForSearchCountry("Pakistan")).value, "Lahore");
    }
  }
}

assert.ok(SEARCH_BENCHMARK_CASES.length >= 8);
console.log("search-benchmark tests passed");
