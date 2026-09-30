#!/usr/bin/env node
/**
 * Verify sitemap health and notify search engines when possible.
 * Google/Bing legacy /ping?sitemap= endpoints are retired (404/410).
 *
 * Usage: node scripts/ping-sitemap.mjs
 * Env:
 *   NEXT_PUBLIC_APP_URL (defaults to https://www.mytutoringhub.com)
 *   INDEXNOW_KEY (optional) — if set, submits sitemap URL via IndexNow
 */
const base = (process.env.NEXT_PUBLIC_APP_URL || "https://www.mytutoringhub.com").replace(
  /\/$/,
  "",
);
const sitemap = `${base}/sitemap.xml`;
const indexNowKey = (process.env.INDEXNOW_KEY || "").trim();

console.log("Sitemap:", sitemap);

const sm = await fetch(sitemap, {
  headers: { "user-agent": "MTH-Sitemap-Ping/1.1", "cache-control": "no-cache" },
});
const body = sm.ok ? await sm.text() : "";
const locCount = [...body.matchAll(/<loc>/g)].length;
console.log(
  sm.ok ? "OK" : "FAIL",
  sm.status,
  `sitemap fetch (${locCount} locs)`,
);

if (!sm.ok) {
  process.exitCode = 1;
}

if (indexNowKey) {
  const host = new URL(base).host;
  const payload = {
    host,
    key: indexNowKey,
    keyLocation: `${base}/${indexNowKey}.txt`,
    urlList: [sitemap, `${base}/`, `${base}/search`, `${base}/pricing`, `${base}/past-papers`],
  };
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    console.log(
      res.ok || res.status === 202 ? "OK" : "FAIL",
      res.status,
      "IndexNow submit",
    );
    if (!(res.ok || res.status === 202)) process.exitCode = 1;
  } catch (err) {
    console.error("ERR IndexNow", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
} else {
  console.log(
    "SKIP IndexNow (set INDEXNOW_KEY to notify Bing/Yandex). Google: use Search Console → Sitemaps / URL Inspection.",
  );
}

console.log(
  "Manual: https://search.google.com/search-console — submit/re-inspect stale Free / Cambridge-on-Edexcel URLs.",
);
