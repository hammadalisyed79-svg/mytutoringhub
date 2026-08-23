/**
 * Cold-load layout-shift capture (mobile viewport).
 * Temporary diagnostic tooling — not shipped to production runtime.
 */
import puppeteer from "puppeteer";

const url = process.argv[2] || "https://www.mytutoringhub.com/";

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});

const page = await browser.newPage();
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.625 });
await page.setUserAgent(
  "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
);

await page.evaluateOnNewDocument(() => {
  window.__cls = [];
  window.__snaps = [];
  window.__lastKey = "";
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.hadRecentInput) continue;
      const sources = (e.sources || []).map((s) => {
        const n = s.node;
        let sel = null;
        if (n) {
          const cls =
            typeof n.className === "string" ? n.className.trim().replace(/\s+/g, ".") : "";
          sel = `${n.tagName.toLowerCase()}${n.id ? `#${n.id}` : ""}${cls ? `.${cls}` : ""}`;
          if (n.textContent) sel += ` «${String(n.textContent).trim().slice(0, 70)}»`;
        }
        const pr = s.previousRect;
        const cr = s.currentRect;
        return {
          sel,
          prev: pr
            ? { y: Math.round(pr.y), h: Math.round(pr.height), w: Math.round(pr.width) }
            : null,
          curr: cr
            ? { y: Math.round(cr.y), h: Math.round(cr.height), w: Math.round(cr.width) }
            : null,
        };
      });
      window.__cls.push({
        value: Number(e.value.toFixed(4)),
        t: Math.round(e.startTime),
        sources,
      });
    }
  }).observe({ type: "layout-shift", buffered: true });

  setInterval(() => {
    try {
      const h1s = [...document.querySelectorAll("h1")].map((h) => ({
        text: (h.textContent || "").trim().slice(0, 60),
        h: Math.round(h.getBoundingClientRect().height),
      }));
      const el = document.querySelector("main")?.firstElementChild;
      const mainFirst = el
        ? {
            cls: String(el.className || "").slice(0, 100),
            tag: el.tagName,
            h: Math.round(el.getBoundingClientRect().height),
          }
        : null;
      const key = JSON.stringify({ h1s, mainFirst });
      if (key !== window.__lastKey) {
        window.__lastKey = key;
        window.__snaps.push({ t: Math.round(performance.now()), h1s, mainFirst });
      }
    } catch {
      /* ignore */
    }
  }, 40);
});

await page.goto(url, { waitUntil: "networkidle0", timeout: 90000 });
await new Promise((r) => setTimeout(r, 2000));

const result = await page.evaluate(() => ({
  clsSum: (window.__cls || []).reduce((a, e) => a + e.value, 0),
  shifts: window.__cls || [],
  snaps: window.__snaps || [],
  finalH1s: [...document.querySelectorAll("h1")].map((h) => (h.textContent || "").trim()),
}));

console.log(JSON.stringify({ url, ...result }, null, 2));
await browser.close();
