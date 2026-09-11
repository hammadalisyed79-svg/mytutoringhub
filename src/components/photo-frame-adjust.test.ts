import assert from "node:assert/strict";
import { containZoomForCover } from "@/lib/photo-face-crop";

assert.equal(containZoomForCover(500, 500, 200, 200), 1);
const wide = containZoomForCover(1600, 900, 200, 200);
assert.ok(wide < 1 && wide > 0.3, `wide fit was ${wide}`);
const tall = containZoomForCover(900, 1600, 200, 200);
assert.ok(tall < 1 && tall > 0.3, `tall fit was ${tall}`);
assert.ok(Math.abs(wide - tall) < 0.001);

console.log("photo-frame-adjust.test.ts: ok");
