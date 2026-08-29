import assert from "node:assert/strict";
import { clearAnonymousTutorMemory, isDisplayableTutorRef } from "./saved-tutors";

assert.equal(
  isDisplayableTutorRef({ tutorProfileId: "p1", name: "Ada", href: "/listings/1" }),
  true,
);
assert.equal(
  isDisplayableTutorRef({ tutorProfileId: "", name: "Ada", href: "/listings/1" }),
  false,
);
assert.equal(
  isDisplayableTutorRef({ tutorProfileId: "p1", name: "  ", href: "/listings/1" }),
  false,
);

const store = new Map<string, string>();
const memory = {
  getItem(key: string) {
    return store.has(key) ? store.get(key)! : null;
  },
  setItem(key: string, value: string) {
    store.set(key, value);
  },
  removeItem(key: string) {
    store.delete(key);
  },
};

Object.defineProperty(globalThis, "window", {
  value: {
    localStorage: memory,
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
  },
  configurable: true,
});
Object.defineProperty(globalThis, "localStorage", {
  value: memory,
  configurable: true,
});

store.set("mth_saved_tutors_v1", "[]");
store.set("mth_recent_tutors_v1", "[]");
clearAnonymousTutorMemory();
assert.equal(store.has("mth_saved_tutors_v1"), false);
assert.equal(store.has("mth_recent_tutors_v1"), false);

console.log("saved-tutors.test.ts passed");
