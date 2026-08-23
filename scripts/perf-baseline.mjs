/**
 * Mobile performance baseline via PageSpeed Insights API (no key = limited quota).
 * Usage: node scripts/perf-baseline.mjs [baseUrl]
 */
const BASE = (process.argv[2] || "https://www.mytutoringhub.com").replace(/\/$/, "");

const ROUTES = [
  "/",
  "/search",
  "/subjects",
  "/past-papers",
  "/past-papers/cambridge/igcse/physics-0625",
  "/past-papers/cambridge/o-level/business-7115",
  "/pricing",
  "/how-it-works",
  "/assistant",
];

async function resolveTutorPath() {
  const sm = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const m = sm.match(/https:\/\/[^<]+\/tutors\/[a-z0-9]+/i);
  return m ? new URL(m[0]).pathname : null;
}

async function psi(path) {
  const url = `${BASE}${path}`;
  const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance`;
  const res = await fetch(api);
  if (!res.ok) {
    return { path, error: `${res.status} ${await res.text().then((t) => t.slice(0, 120))}` };
  }
  const data = await res.json();
  const lhr = data.lighthouseResult;
  const audits = lhr?.audits || {};
  const metrics = lhr?.audits?.metrics?.details?.items?.[0] || {};
  return {
    path,
    score: Math.round((lhr?.categories?.performance?.score || 0) * 100),
    LCP: audits["largest-contentful-paint"]?.numericValue,
    FCP: audits["first-contentful-paint"]?.numericValue,
    CLS: audits["cumulative-layout-shift"]?.numericValue,
    TBT: audits["total-blocking-time"]?.numericValue,
    SI: audits["speed-index"]?.numericValue,
    TTFB: audits["server-response-time"]?.numericValue,
    totalByteWeight: audits["total-byte-weight"]?.numericValue,
    unusedJs: audits["unused-javascript"]?.numericValue,
    displayValue: {
      LCP: audits["largest-contentful-paint"]?.displayValue,
      FCP: audits["first-contentful-paint"]?.displayValue,
      CLS: audits["cumulative-layout-shift"]?.displayValue,
      TBT: audits["total-blocking-time"]?.displayValue,
      TTFB: audits["server-response-time"]?.displayValue,
      bytes: audits["total-byte-weight"]?.displayValue,
    },
    // keep raw ms for comparison
    raw: {
      LCP: metrics.largestContentfulPaint,
      FCP: metrics.firstContentfulPaint,
      CLS: metrics.cumulativeLayoutShift,
      TBT: metrics.totalBlockingTime,
      TTFB: audits["server-response-time"]?.numericValue,
      bytes: audits["total-byte-weight"]?.numericValue,
    },
  };
}

async function main() {
  const tutor = await resolveTutorPath();
  const paths = [...ROUTES];
  if (tutor) paths.splice(2, 0, tutor);

  const results = [];
  for (const path of paths) {
    process.stderr.write(`PSI ${path}...\n`);
    try {
      const row = await psi(path);
      results.push(row);
      console.error(
        `  score=${row.score} LCP=${row.displayValue?.LCP} CLS=${row.displayValue?.CLS} TBT=${row.displayValue?.TBT}`,
      );
    } catch (err) {
      results.push({ path, error: String(err) });
    }
    await new Promise((r) => setTimeout(r, 2500));
  }

  console.log(JSON.stringify({ base: BASE, strategy: "mobile", measuredAt: new Date().toISOString(), results }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
