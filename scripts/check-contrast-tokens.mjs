#!/usr/bin/env node
/**
 * Token-level WCAG 2.2 contrast audit for My Tutoring Hub design tokens.
 * Usage: node scripts/check-contrast-tokens.mjs
 */

function parseHex(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return [r, g, b];
}

function parseRgba(str) {
  const m = str.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(",").map((p) => p.trim());
  const r = Number(parts[0]) / 255;
  const g = Number(parts[1]) / 255;
  const b = Number(parts[2]) / 255;
  const a = parts[3] !== undefined ? Number(parts[3]) : 1;
  return { rgb: [r, g, b], a };
}

function relLuminance([r, g, b]) {
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function blendFgOnBg(fgRgb, fgA, bgRgb) {
  return fgRgb.map((c, i) => c * fgA + bgRgb[i] * (1 - fgA));
}

function contrast(fg, bg) {
  const l1 = relLuminance(fg);
  const l2 = relLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function toRgb(color, bg = [1, 1, 1]) {
  if (color.startsWith("#")) return parseHex(color);
  const rgba = parseRgba(color);
  if (!rgba) throw new Error(`Unsupported color: ${color}`);
  return blendFgOnBg(rgba.rgb, rgba.a, bg);
}

const PAIRS = [
  ["--ink on --paper", "#0c1815", "#f3f1eb", 4.5],
  ["--muted on --paper", "#3d524c", "#f3f1eb", 4.5],
  ["--muted-light on --surface", "#556860", "#fffdf9", 4.5],
  ["--link on --surface", "#075e52", "#fffdf9", 4.5],
  ["--ink-soft on header cream", "#1a2e28", "#f8f6f1", 4.5],
  ["placeholder on white", "#5f726b", "#ffffff", 4.5],
  ["--brand btn text on --brand", "#ffffff", "#0a5c50", 4.5],
  ["--brand-deep btn hover text", "#ffffff", "#064236", 4.5],
  ["--on-dark-muted on hero overlay", "rgba(255, 252, 247, 0.94)", "#1a3d36", 4.5],
  ["--on-dark-subtle on hero overlay", "rgba(255, 252, 247, 0.88)", "#1a3d36", 4.5],
  ["--on-dark-link on hero overlay", "#fff8f3", "#1a3d36", 4.5],
  ["faq answer --muted on white", "#3d524c", "#ffffff", 4.5],
  ["ai-support launcher text", "#ffffff", "#0a5c50", 4.5],
  ["--accent on --paper", "#9a4518", "#f3f1eb", 4.5],
];

let fail = 0;
console.log("WCAG AA token contrast audit\n");
for (const [label, fg, bg, min] of PAIRS) {
  const bgRgb = toRgb(bg);
  const fgRgb = toRgb(fg, bgRgb);
  const ratio = contrast(fgRgb, bgRgb);
  const ok = ratio >= min;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${ratio.toFixed(2)}:1 (min ${min}) — ${label}`);
}
console.log(`\n${fail} failing pair(s)`);
process.exit(fail > 0 ? 1 : 0);
