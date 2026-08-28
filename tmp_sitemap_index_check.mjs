import { writeFileSync } from "node:fs";

const sitemapXml = await fetch("https://www.mytutoringhub.com/sitemap.xml").then((r) => r.text());
const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const buckets = {
  static: [],
  subjects: [],
  pastPapers: [],
  tutors: [],
  other: [],
};

for (const url of urls) {
  const path = url.replace("https://www.mytutoringhub.com", "") || "/";
  if (path.startsWith("/s/")) buckets.subjects.push(path);
  else if (path.startsWith("/past-papers/")) buckets.pastPapers.push(path);
  else if (path.startsWith("/tutors/")) buckets.tutors.push(path);
  else if (
    [
      "/",
      "/search",
      "/subjects",
      "/past-papers",
      "/ads",
      "/pricing",
      "/free-vs-paid",
      "/help",
      "/terms",
      "/privacy",
      "/how-it-works",
      "/become-a-tutor",
      "/about",
      "/contact",
    ].includes(path)
  ) {
    buckets.static.push(path);
  } else buckets.other.push(path);
}

const supplySubjects = [
  "/s/mathematics",
  "/s/accounting",
  "/s/computer-science",
  "/s/computer-applications",
  "/s/igcse-maths",
  "/s/cbse-maths",
];

const checkPaths = [
  "/",
  "/search",
  "/pricing",
  "/past-papers",
  "/subjects",
  "/how-it-works",
  "/become-a-tutor",
  "/free-vs-paid",
  "/help",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/ads",
  "/s/mathematics",
  "/s/accounting",
  "/s/chemistry",
  "/s/mark-schemes",
  "/tutors/cmsx3iyd20002hekfp2q2g9r7",
  "/past-papers/cambridge/igcse/mathematics-0580",
];

const checks = [];
for (const path of checkPaths) {
  const html = await fetch(`https://www.mytutoringhub.com${path}`).then((r) => r.text());
  const robots = html.match(/name=["']robots["']\s+content=["']([^"']+)["']/i)?.[1]
    || html.match(/content=["']([^"']+)["']\s+name=["']robots["']/i)?.[1]
    || "(inherit layout: index,follow)";
  const canonical = html.match(/rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1]
    || html.match(/href=["']([^"']+)["']\s+rel=["']canonical["']/i)?.[1]
    || "-";
  const noindex = /noindex/i.test(robots);
  checks.push({ path, robots, canonical, noindex });
}

const out = {
  fetchedAt: new Date().toISOString(),
  sitemapTotal: urls.length,
  buckets: {
    static: buckets.static.length,
    subjects: buckets.subjects.length,
    pastPapers: buckets.pastPapers.length,
    tutors: buckets.tutors.length,
    other: buckets.other.length,
  },
  staticRoutes: buckets.static,
  tutorRoutes: buckets.tutors,
  supplySubjectsInSitemap: supplySubjects.filter((p) => buckets.subjects.includes(p)),
  suspiciousSubjectSlugs: buckets.subjects.filter((p) =>
    /feb-march|may-june|oct-nov|mark-schemes|grade-thresholds|inserts|question-papers|examiner-reports|confidential|unknown-session|other$/i.test(
      p,
    ),
  ),
  checks,
};

writeFileSync("C:/Tutor/tmp_sitemap_index_check.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
