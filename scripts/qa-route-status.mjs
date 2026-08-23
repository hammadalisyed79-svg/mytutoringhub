const base = process.argv[2] || "https://www.mytutoringhub.com";

const paths = [
  "/",
  "/search",
  "/subjects",
  "/student-requests",
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
  "/ads",
  "/this-route-should-404-qa-check",
];

async function status(path) {
  const r = await fetch(base + path, {
    redirect: "manual",
    headers: { "user-agent": "MTH-QA" },
  });
  return { path, status: r.status, location: r.headers.get("location") };
}

async function main() {
  for (const p of paths) {
    const r = await status(p);
    console.log(`${r.status} ${r.path}${r.location ? " -> " + r.location : ""}`);
  }

  const sm = await (await fetch(base + "/sitemap.xml")).text();
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const paperNeedles = ["physics", "business", "chemistry", "computer"];
  for (const w of paperNeedles) {
    const hit = locs.find((u) => u.toLowerCase().includes("/past-papers/") && u.toLowerCase().includes(w));
    if (!hit) {
      console.log(`MISS paper ${w}`);
      continue;
    }
    const path = new URL(hit).pathname;
    const r = await fetch(hit, { redirect: "manual", headers: { "user-agent": "MTH-QA" } });
    console.log(`${r.status} ${path}`);
  }
  const tutor = locs.find((u) => u.includes("/tutors/"));
  if (tutor) {
    const r = await fetch(tutor, { redirect: "manual", headers: { "user-agent": "MTH-QA" } });
    console.log(`${r.status} ${new URL(tutor).pathname}`);
  }
  const subject = locs.find((u) => /\/s\//.test(u));
  if (subject) {
    const r = await fetch(subject, { redirect: "manual", headers: { "user-agent": "MTH-QA" } });
    console.log(`${r.status} ${new URL(subject).pathname}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
