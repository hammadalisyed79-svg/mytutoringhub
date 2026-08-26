#!/usr/bin/env node
/**
 * Ping search engines after tutor supply or sitemap changes.
 * Usage: node scripts/ping-sitemap.mjs
 * Env: NEXT_PUBLIC_APP_URL (defaults to https://www.mytutoringhub.com)
 */
const base = (process.env.NEXT_PUBLIC_APP_URL || "https://www.mytutoringhub.com").replace(
  /\/$/,
  "",
);
const sitemap = `${base}/sitemap.xml`;

const endpoints = [
  `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemap)}`,
  `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemap)}`,
];

for (const url of endpoints) {
  try {
    const res = await fetch(url, { method: "GET" });
    console.log(res.ok ? "OK" : "FAIL", res.status, url);
  } catch (err) {
    console.error("ERR", url, err instanceof Error ? err.message : err);
  }
}

console.log("Sitemap:", sitemap);
