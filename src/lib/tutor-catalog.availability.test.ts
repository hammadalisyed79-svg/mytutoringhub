import assert from "node:assert/strict";
import { formatTutorAvailability, formatTutorPlace } from "@/lib/tutor-catalog";

assert.equal(formatTutorPlace("Online", null), "Online");
assert.equal(formatTutorAvailability({ location: "Online", online: true, inPerson: false }), "Online");
assert.equal(
  formatTutorAvailability({ location: "Online", country: "Pakistan", online: true, inPerson: false }),
  "Online, Pakistan",
);
assert.equal(
  formatTutorAvailability({ location: "Lahore", country: "Pakistan", online: true, inPerson: false }),
  "Lahore, Pakistan · Online",
);
assert.equal(
  formatTutorAvailability({ location: "Lahore", country: "Pakistan", online: false, inPerson: true }),
  "Lahore, Pakistan · In person",
);
assert.equal(
  formatTutorAvailability({ location: "", country: "Pakistan", online: true, inPerson: false }),
  "Pakistan · Online",
);
assert.equal(
  formatTutorAvailability({ location: "Online", online: true, inPerson: true }),
  "Online · In person",
);

console.log("tutor-catalog availability tests: ok");
