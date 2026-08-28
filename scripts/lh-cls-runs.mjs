/**
 * Capture layout-shift PerformanceObserver entries on production homepage.
 * Usage: npx playwright... or node with puppeteer — here we use lighthouse trace + CDP via chrome-launcher if needed.
 *
 * Fallback: inject observer via lighthouse --only-categories=performance and also a small HTML runner.
 */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const URL = process.argv[2] || "https://www.mytutoringhub.com/";
const runs = Number(process.argv[3] || 3);

function runLighthouse(outPath) {
  return new Promise((resolve, reject) => {
    const args = [
      "--yes",
      "lighthouse",
      URL,
      "--only-categories=performance",
      "--form-factor=mobile",
      "--screenEmulation.mobile",
      "--output=json",
      `--output-path=${outPath}`,
      "--chrome-flags=--headless --no-sandbox --disable-gpu",
      "--quiet",
    ];
    const child = spawn("npx", args, { stdio: "inherit", shell: true });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`lh exit ${code}`))));
  });
}

function summarize(path) {
  const d = JSON.parse(awaitImport(path));
  return {
    score: Math.round(d.categories.performance.score * 100),
    CLS: d.audits["cumulative-layout-shift"].numericValue,
    CLS_display: d.audits["cumulative-layout-shift"].displayValue,
    LCP: d.audits["largest-contentful-paint"].displayValue,
    TBT: d.audits["total-blocking-time"].displayValue,
    bytes: d.audits["total-byte-weight"].displayValue,
    layoutShifts: d.audits["layout-shifts"]?.details?.items || [],
  };
}

function awaitImport(path) {
  return require("node:fs").readFileSync(path, "utf8");
}

const results = [];
for (let i = 1; i <= runs; i++) {
  const out = `tmp_lh_cls_run${i}.json`;
  console.error(`Lighthouse run ${i}/${runs}...`);
  await runLighthouse(out);
  results.push({ run: i, ...summarize(out) });
  console.error(JSON.stringify(results[results.length - 1]));
}

writeFileSync("tmp_lh_cls_runs.json", JSON.stringify({ url: URL, results }, null, 2));
console.log(JSON.stringify({ url: URL, results }, null, 2));
