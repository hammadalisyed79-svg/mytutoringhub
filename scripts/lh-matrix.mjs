/**
 * Multi-route Lighthouse mobile matrix for production.
 * Usage: node scripts/lh-matrix.mjs
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const BASE = process.env.LH_BASE || "https://www.mytutoringhub.com";

const routes = [
  { name: "home", path: "/", runs: 3 },
  { name: "search", path: "/search", runs: 1 },
  { name: "subjects", path: "/subjects", runs: 1 },
  { name: "past-papers", path: "/past-papers", runs: 1 },
  // Physics past-paper subject page (resolved at runtime if needed)
  { name: "past-paper-physics", path: null, runs: 1 },
  { name: "pricing", path: "/pricing", runs: 1 },
  { name: "how-it-works", path: "/how-it-works", runs: 1 },
  { name: "become-a-tutor", path: "/become-a-tutor", runs: 1 },
  { name: "tutor-profile", path: null, runs: 1 },
];

async function resolveDynamicPaths() {
  // Active public tutor from search HTML
  const searchHtml = await fetch(`${BASE}/search`).then((r) => r.text());
  const tutorMatch = searchHtml.match(/href="(\/tutors\/[^"]+)"/);
  const tutorPath = tutorMatch?.[1] || null;

  // Physics past papers page from past-papers index
  const ppHtml = await fetch(`${BASE}/past-papers`).then((r) => r.text());
  const physicsMatch =
    ppHtml.match(/href="(\/past-papers\/[^"]*physics[^"]*)"/i) ||
    ppHtml.match(/href="(\/past-papers\/[^"]+)"/i);
  const physicsPath = physicsMatch?.[1] || null;

  return { tutorPath, physicsPath };
}

function runLh(url, outPath) {
  return new Promise((resolve, reject) => {
    const args = [
      "--yes",
      "lighthouse",
      url,
      "--only-categories=performance",
      "--form-factor=mobile",
      "--screenEmulation.mobile",
      "--output=json",
      `--output-path=${outPath}`,
      "--chrome-flags=--headless --no-sandbox --disable-gpu",
      "--quiet",
    ];
    const child = spawn("npx", args, { stdio: "inherit", shell: true });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`lh ${code}`))));
  });
}

function summarize(path) {
  const d = JSON.parse(readFileSync(path, "utf8"));
  return {
    score: Math.round((d.categories.performance.score || 0) * 100),
    FCP: d.audits["first-contentful-paint"]?.displayValue,
    LCP: d.audits["largest-contentful-paint"]?.displayValue,
    CLS: Number(d.audits["cumulative-layout-shift"]?.numericValue?.toFixed?.(3) ?? d.audits["cumulative-layout-shift"]?.numericValue),
    TBT: d.audits["total-blocking-time"]?.displayValue,
    SI: d.audits["speed-index"]?.displayValue,
    transfer: d.audits["total-byte-weight"]?.displayValue,
  };
}

const { tutorPath, physicsPath } = await resolveDynamicPaths();
console.log("Resolved tutor:", tutorPath, "physics:", physicsPath);

const results = [];

for (const route of routes) {
  let path = route.path;
  if (route.name === "tutor-profile") path = tutorPath;
  if (route.name === "past-paper-physics") path = physicsPath;
  if (!path) {
    results.push({ name: route.name, skipped: true, reason: "unavailable" });
    continue;
  }
  const url = `${BASE}${path}`;
  const runs = [];
  for (let i = 0; i < route.runs; i++) {
    const out = `tmp_lh_matrix_${route.name}_${i + 1}.json`;
    console.log(`\n=== ${route.name} run ${i + 1}/${route.runs}: ${url} ===`);
    await runLh(url, out);
    runs.push(summarize(out));
  }
  results.push({ name: route.name, path, url, runs });
}

writeFileSync("tmp_lh_matrix_summary.json", JSON.stringify(results, null, 2));
console.log("\n\nSUMMARY\n", JSON.stringify(results, null, 2));
