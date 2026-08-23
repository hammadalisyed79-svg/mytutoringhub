/**
 * Light technical-SEO checks against production (canonical host, robots, sitemap hygiene).
 * Usage: node scripts/seo-route-audit.mjs [baseUrl]
 */
const BASE = (process.argv[2] || "https://www.mytutoringhub.com").replace(/\/$/, "");

async function fetchText(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "user-agent": "MTH-SEO-Audit/1.0", "cache-control": "no-cache" },
    redirect: "manual",
  });
  const text = res.status >= 300 && res.status < 400 ? "" : await res.text();
  return { status: res.status, location: res.headers.get("location"), text };
}

function extract(meta, re) {
  const m = meta.match(re);
  return m ? m[1] : null;
}

async function pageSeo(path) {
  const { status, text } = await fetchText(path);
  if (status !== 200) return { path, status };
  return {
    path,
    status,
    title: extract(text, /<title>([^<]+)<\/title>/i),
    canonical: extract(text, /rel="canonical"\s+href="([^"]+)"/i) || extract(text, /href="([^"]+)"\s+rel="canonical"/i),
    robots: extract(text, /name="robots"\s+content="([^"]+)"/i) || extract(text, /content="([^"]+)"\s+name="robots"/i),
    hasLocalhost: /localhost|127\.0\.0\.1|vercel\.app/i.test(text),
    h1: [...text.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => m[1].replace(/<[^>]+>/g, "").trim()).slice(0, 2),
  };
}

async function main() {
  const robots = await fetchText("/robots.txt");
  const sm = await fetchText("/sitemap.xml");
  const locs = [...(sm.text.matchAll(/<loc>([^<]+)<\/loc>/g) || [])].map((m) => m[1]);
  const badHost = locs.filter((u) => !u.startsWith(BASE));
  const hasLogin = locs.some((u) => u.endsWith("/login") || u.endsWith("/register"));
  const cityFanout = locs.filter((u) => /\/s\/[^/]+\/[^/]+$/.test(u)).length;
  const tutors = locs.filter((u) => /\/tutors\//.test(u)).length;
  const papers = locs.filter((u) => /\/past-papers\//.test(u)).length;
  const subjects = locs.filter((u) => /\/s\/[^/]+$/.test(u)).length;

  const pages = [];
  for (const p of [
    "/",
    "/search",
    "/search?subject=Mathematics",
    "/login",
    "/subjects",
    "/past-papers",
    "/past-papers/cambridge/igcse/physics-0625",
    "/past-papers/cambridge/igcse/physics-0625?year=2024",
    "/pricing",
    "/how-it-works",
    "/s/arabic",
  ]) {
    pages.push(await pageSeo(p));
  }

  console.log(
    JSON.stringify(
      {
        base: BASE,
        robotsStatus: robots.status,
        robotsSnippet: robots.text.slice(0, 500),
        sitemapStatus: sm.status,
        sitemapCount: locs.length,
        sitemapHasLoginRegister: hasLogin,
        sitemapCityFanout: cityFanout,
        sitemapSubjects: subjects,
        sitemapPapers: papers,
        sitemapTutors: tutors,
        badHostCount: badHost.length,
        badHostSample: badHost.slice(0, 5),
        pages,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
