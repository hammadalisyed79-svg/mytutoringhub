/**
 * Gentle public internal-link crawl for Mobile/A11y QA.
 * Does not submit forms, follow auth-only deep trees, or hammer production.
 *
 * Usage: node scripts/public-link-crawl.mjs [baseUrl]
 */
const BASE = (process.argv[2] || "https://www.mytutoringhub.com").replace(/\/$/, "");
const MAX_URLS = 120;
const CONCURRENCY = 3;
const DELAY_MS = 180;

const SEEDS = [
  "/",
  "/search",
  "/subjects",
  "/student-requests",
  "/ads",
  "/past-papers",
  "/study/assistant",
  "/assistant",
  "/study/countdown",
  "/study/progress",
  "/how-it-works",
  "/become-a-tutor",
  "/pricing",
  "/free-vs-paid",
  "/about",
  "/help",
  "/contact",
  "/terms",
  "/privacy",
  "/login",
  "/register",
  "/support",
  "/forgot-password",
  "/sitemap.xml",
  "/this-route-should-404-qa-check",
];

const SKIP_PREFIXES = [
  "/api/",
  "/admin",
  "/dashboard",
  "/messages",
  "/settings",
  "/receipt/",
  "/_next/",
];

const results = {
  ok: [],
  redirect: [],
  notFound: [],
  error: [],
  badHref: [],
  externalSample: [],
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeHref(href, fromUrl) {
  if (!href || href === "#") return { bad: href || "(empty)" };
  if (href.startsWith("mailto:") || href.startsWith("tel:")) {
    return { mailto: href };
  }
  if (href.startsWith("javascript:")) return { bad: href };
  try {
    const u = new URL(href, fromUrl);
    if (u.hostname.includes("localhost") || u.hostname.includes("127.0.0.1")) {
      return { bad: href };
    }
    if (u.origin !== new URL(BASE).origin) {
      return { external: u.href };
    }
    u.hash = "";
    return { internal: u.pathname + u.search };
  } catch {
    return { bad: href };
  }
}

function shouldSkip(path) {
  return SKIP_PREFIXES.some((p) => path === p || path.startsWith(p));
}

async function fetchStatus(path) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": "MTH-PublicQA-Crawl/1.0" },
    });
    return { url, status: res.status, location: res.headers.get("location"), body: res };
  } catch (err) {
    return { url, status: 0, error: String(err) };
  }
}

async function extractLinks(path) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { "user-agent": "MTH-PublicQA-Crawl/1.0", accept: "text/html" },
  });
  if (!res.ok) return [];
  const html = await res.text();
  const hrefs = [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const out = [];
  for (const href of hrefs) {
    const n = normalizeHref(href, url);
    if (n.bad != null) results.badHref.push({ from: path, href: n.bad });
    if (n.mailto) {
      if (!/^mailto:[^\s?]+@[^?\s]+/i.test(n.mailto) && !n.mailto.startsWith("tel:")) {
        results.badHref.push({ from: path, href: n.mailto });
      }
    }
    if (n.external) {
      if (results.externalSample.length < 20) results.externalSample.push(n.external);
    }
    if (n.internal && !shouldSkip(n.internal.split("?")[0])) out.push(n.internal);
  }
  return out;
}

async function main() {
  const queue = [...SEEDS];
  const seen = new Set();
  const linkFrontier = new Set(SEEDS);

  // Expand from homepage + footer-bearing pages first
  for (const seed of ["/", "/help", "/past-papers", "/pricing"]) {
    await sleep(DELAY_MS);
    const links = await extractLinks(seed);
    for (const l of links) linkFrontier.add(l.split("#")[0]);
  }

  // Pull a few subject / paper URLs from sitemap
  try {
    const sm = await fetch(`${BASE}/sitemap.xml`, {
      headers: { "user-agent": "MTH-PublicQA-Crawl/1.0" },
    });
    const xml = await sm.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    for (const loc of locs) {
      try {
        const u = new URL(loc);
        if (u.origin === new URL(BASE).origin) {
          const p = u.pathname;
          if (
            p.startsWith("/past-papers/") ||
            p.startsWith("/s/") ||
            p.startsWith("/tutors/") ||
            SEEDS.includes(p)
          ) {
            linkFrontier.add(p);
          }
        }
      } catch {
        /* ignore */
      }
    }
  } catch (err) {
    console.error("sitemap fetch failed", err);
  }

  queue.push(...linkFrontier);

  async function worker() {
    while (queue.length && seen.size < MAX_URLS) {
      const path = queue.shift();
      if (!path || seen.has(path) || shouldSkip(path.split("?")[0])) continue;
      seen.add(path);
      await sleep(DELAY_MS);
      const r = await fetchStatus(path);
      if (r.error) {
        results.error.push({ path, error: r.error });
        continue;
      }
      if (r.status >= 200 && r.status < 300) results.ok.push({ path, status: r.status });
      else if (r.status >= 300 && r.status < 400)
        results.redirect.push({ path, status: r.status, location: r.location });
      else if (r.status === 404) results.notFound.push({ path, status: 404 });
      else results.error.push({ path, status: r.status });
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const report = {
    base: BASE,
    checked: seen.size,
    ok: results.ok.length,
    redirects: results.redirect.length,
    notFound: results.notFound,
    errors: results.error,
    badHrefs: results.badHref.slice(0, 40),
    externalSample: [...new Set(results.externalSample)].slice(0, 15),
    sampleOk: results.ok.slice(0, 40).map((x) => x.path),
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
