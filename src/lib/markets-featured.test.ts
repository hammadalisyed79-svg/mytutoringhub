import assert from "node:assert/strict";
import {
  FEATURED_COUNTRY_LIMIT,
  HOMEPAGE_FEATURED_COUNTRY_CODES,
  TOP_COUNTRIES,
  selectFeaturedMarketCountries,
} from "./markets";
import { splitCurriculumCountries } from "./curriculum";

const { featured, rest } = selectFeaturedMarketCountries();
assert.equal(featured.length, FEATURED_COUNTRY_LIMIT);
assert.deepEqual(
  featured.map((c) => c.code),
  [...HOMEPAGE_FEATURED_COUNTRY_CODES],
);
assert.equal(featured.length + rest.length, TOP_COUNTRIES.length);
assert.ok(!rest.some((c) => featured.some((f) => f.code === c.code)));

const pinned = selectFeaturedMarketCountries("New Zealand");
assert.equal(pinned.featured[0].name, "New Zealand");
assert.equal(pinned.featured.length, FEATURED_COUNTRY_LIMIT);
assert.ok(!pinned.rest.some((c) => c.name === "New Zealand"));
assert.ok(pinned.rest.some((c) => c.code === "AU"));

const australia = selectFeaturedMarketCountries("Australia");
assert.equal(australia.featured[0].name, "Australia");
assert.equal(australia.featured.length, FEATURED_COUNTRY_LIMIT);
assert.ok(!australia.rest.some((c) => c.name === "Australia"));

const { featured: cf, rest: cr } = splitCurriculumCountries();
assert.equal(cf.length, FEATURED_COUNTRY_LIMIT);
assert.equal(cf.length + cr.length, 15);
assert.ok(cf.includes("Pakistan"));
assert.ok(cf.includes("Australia"));
assert.ok(cr.includes("Singapore"));

{
  const compact = selectFeaturedMarketCountries(undefined, { compact: true });
  assert.equal(compact.featured.length, 6);
  assert.deepEqual(
    compact.featured.map((c) => c.code),
    ["GB", "AE", "PK", "SA", "US", "DE"],
  );
  assert.equal(compact.featured.length + compact.rest.length, TOP_COUNTRIES.length);
}

console.log("markets-featured tests passed");
console.log("featured:", featured.map((c) => c.name).join(", "));
console.log("curriculum rest:", cr.join(", "));
