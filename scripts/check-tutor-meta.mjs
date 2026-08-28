const id = process.argv[2];
if (!id) {
  console.error("usage: node scripts/check-tutor-meta.mjs <id>");
  process.exit(1);
}
const r = await fetch(`https://www.mytutoringhub.com/tutors/${id}`);
const t = await r.text();
const robots =
  (t.match(/name="robots"[^>]*content="([^"]+)"/i) ||
    t.match(/content="([^"]+)"[^>]*name="robots"/i) ||
    [])[1] || null;
console.log({ status: r.status, robots, title: (t.match(/<title>([^<]+)</i) || [])[1] });
