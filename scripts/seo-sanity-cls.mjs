const urls = [
  ["home", "https://www.mytutoringhub.com/"],
  ["search-filtered", "https://www.mytutoringhub.com/search?subject=Maths"],
  ["tutor", "https://www.mytutoringhub.com/tutors/cmsx3iyd20002hekfp2q2g9r7"],
  ["pp-physics", "https://www.mytutoringhub.com/past-papers/cambridge/igcse/physics-0625"],
  ["robots", "https://www.mytutoringhub.com/robots.txt"],
  ["sitemap", "https://www.mytutoringhub.com/sitemap.xml"],
];

for (const [n, u] of urls) {
  const r = await fetch(u, { redirect: "manual" });
  const t = await r.text();
  const canon =
    (t.match(/rel="canonical"[^>]*href="([^"]+)"/i) ||
      t.match(/href="([^"]+)"[^>]*rel="canonical"/i) ||
      [])[1] || null;
  const robotsMeta =
    (t.match(/name="robots"[^>]*content="([^"]+)"/i) ||
      t.match(/content="([^"]+)"[^>]*name="robots"/i) ||
      [])[1] || null;
  console.log(JSON.stringify({ n, status: r.status, canon, robotsMeta, bytes: t.length }));
}
