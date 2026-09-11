import assert from "node:assert/strict";
import { containZoomForCover } from "@/components/PhotoFrameAdjust";

// Square image in square frame → already fits at zoom 1
assert.equal(containZoomForCover(500, 500, 200, 200), 1);

// Wide image in square frame → zoom < 1 so full width+height visible
const wide = containZoomForCover(1600, 900, 200, 200);
assert.ok(wide < 1 && wide > 0.3, `wide fit was ${wide}`);

// Tall image in square frame → zoom < 1
const tall = containZoomForCover(900, 1600, 200, 200);
assert.ok(tall < 1 && tall > 0.3, `tall fit was ${tall}`);

// Wide and tall should be symmetric for swapped dims in square frame
assert.ok(Math.abs(wide - tall) < 0.001);

console.log("photo-frame-adjust.test.ts: ok");
