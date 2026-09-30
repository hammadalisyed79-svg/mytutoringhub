/**
 * Live mobile structural a11y smoke (no Playwright dependency).
 * Checks skip-link, main, h1, img alt via HTML fetch.
 * Overflow/tap-target notes come from optional --browser-json merge.
 *
 * Usage:
 *   node scripts/ops-mobile-a11y-probe.mjs --out docs/MTH-MOBILE-A11Y.json
 *   node scripts/ops-mobile-a11y-probe.mjs --out docs/MTH-MOBILE-A11Y.json --browser-json docs/MTH-MOBILE-BROWSER.json
 */
import { readFileSync, writeFileSync } from "node:fs";

const LIVE = process.env.MTH_LIVE_ORIGIN || "https://www.mytutoringhub.com";
const PATHS = ["/", "/search", "/pricing", "/past-papers", "/ads", "/become-a-tutor", "/help"];

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

async function fetchHtml(path) {
  const res = await fetch(`${LIVE}${path}`, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 MTH-MobileA11y/1.0",
      "cache-control": "no-cache",
    },
    redirect: "follow",
  });
  const text = await res.text();
  return { status: res.status, text };
}

function analyze(html) {
  const hasSkipLink =
    html.includes('href="#main"') ||
    html.includes("href='#main'") ||
    html.includes('href="#content"') ||
    /skip[- ]to[- ]main/i.test(html);
  const hasMain =
    /<main[\s>]/i.test(html) ||
    html.includes('role="main"') ||
    html.includes("role='main'") ||
    html.includes('id="main"') ||
    html.includes("id='main'");
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match?.[1]?.replace(/<[^>]+>/g, "").trim().slice(0, 80) || null;
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || null;
  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const imagesMissingAlt = imgTags.filter((tag) => !/\balt=/i.test(tag)).length;
  return { title, h1, hasSkipLink, hasMain, imagesMissingAlt, imgCount: imgTags.length };
}

const browserPath = argValue("--browser-json");
let browserByPath = {};
if (browserPath) {
  try {
    const raw = JSON.parse(readFileSync(browserPath, "utf8"));
    for (const page of raw.pages || []) browserByPath[page.path] = page;
  } catch {
    browserByPath = {};
  }
}

const pages = [];
for (const path of PATHS) {
  try {
    const { status, text } = await fetchHtml(path);
    const structural = analyze(text);
    const browser = browserByPath[path] || null;
    const overflowX = browser?.overflowX ?? null;
    const hardFail =
      status !== 200 ||
      !structural.hasMain ||
      !structural.hasSkipLink ||
      overflowX === true;
    pages.push({
      path,
      status,
      ok: !hardFail,
      ...structural,
      overflowX,
      smallTargetCount: browser?.smallTargetCount ?? null,
      smallTargetSample: browser?.smallTargetSample ?? null,
      source: browser ? "html+browser" : "html",
    });
  } catch (err) {
    pages.push({
      path,
      status: 0,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  liveOrigin: LIVE,
  viewportNote:
    "HTML structural checks; overflow/tap targets require --browser-json from device/CDP pass",
  pages,
  failed: pages.filter((p) => !p.ok),
  summary: {
    checked: pages.length,
    failures: pages.filter((p) => !p.ok).length,
    overflowFailures: pages.filter((p) => p.overflowX === true).length,
    missingSkip: pages.filter((p) => p.hasSkipLink === false).length,
    missingMain: pages.filter((p) => p.hasMain === false).length,
    missingBrowserOverflow: pages.filter((p) => p.overflowX == null).length,
  },
};

const outPath = argValue("--out");
if (outPath) writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.summary.failures ? 1 : 0);
