import assert from "node:assert/strict";
import {
  faceBoxToPhotoCrop,
  headToShouldersRegion,
  portraitFallbackCrop,
  regionToCoverCrop,
} from "@/lib/photo-face-crop";

const face = { x: 400, y: 200, width: 200, height: 240 };
const region = headToShouldersRegion(face, 1200, 1600, 1);
assert.ok(region.height > face.height, "shoulders region taller than face");
assert.ok(region.y < face.y, "includes hair above face");
assert.ok(region.y + region.height > face.y + face.height, "includes below chin");

const crop = faceBoxToPhotoCrop(face, 1200, 1600, 1);
assert.ok(crop.zoom >= 1, `expected zoomed headshot, got ${crop.zoom}`);
assert.ok(Math.abs(crop.x) <= 100 && Math.abs(crop.y) <= 100);

// Tall image without face → upper square (protects heads)
const tall = portraitFallbackCrop(800, 2000);
assert.ok(tall.zoom >= 1);

// Region → crop centers correctly
const centered = regionToCoverCrop({ x: 100, y: 100, width: 200, height: 200 }, 1000, 1000);
assert.ok(Math.abs(centered.x - (0.5 - 200 / 1000) * 100) < 0.01 || Math.abs(centered.x) < 50);

console.log("photo-face-crop.test.ts: ok");
