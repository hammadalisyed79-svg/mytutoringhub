/**
 * Automate what we can of the remaining launch ops checklist.
 * Writes docs/MTH-OPS-REMAINING.json with status + human click list.
 *
 * Usage: node scripts/ops-remaining-checklist.mjs
 */
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

config({ path: ".env.local" });
config();

const require = createRequire(import.meta.url);
const LIVE = process.env.MTH_LIVE_ORIGIN || "https://www.mytutoringhub.com";

const ADS_PRIMARY = [
  "student_tutor_contact",
  "student_request_created",
  "student_pass_purchase",
  "student_pro_purchase",
  "past_paper_purchase",
  "tutor_profile_completed",
  "teaching_profile_activated",
  "tutor_pro_activation",
  "listing_boost_purchase",
];

const SEO_REINSPECT = [
  `${LIVE}/`,
  `${LIVE}/pricing`,
  `${LIVE}/become-a-tutor`,
  `${LIVE}/free-vs-paid`,
  `${LIVE}/help`,
  `${LIVE}/past-papers/pearson-edexcel/gcse/computer-science`,
  `${LIVE}/past-papers/cambridge/igcse/computer-science-0478`,
  `${LIVE}/subjects`,
  `${LIVE}/search?subject=Science`,
  `${LIVE}/sitemap.xml`,
];

const QA_PATHS = [
  "/",
  "/search",
  "/pricing",
  "/become-a-tutor",
  "/past-papers",
  "/subjects",
  "/help",
  "/ads",
  "/free-vs-paid",
  "/login",
  "/register",
];

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "MTH-Ops-Checklist/1.0", "cache-control": "no-cache" },
    redirect: "manual",
  });
  const text = res.status >= 200 && res.status < 400 ? await res.text() : "";
  return { status: res.status, location: res.headers.get("location"), text };
}

function cleanTagId(id) {
  return String(id || "")
    .replace(/\\+$/g, "")
    .replace(/[^\w-].*$/, "")
    .trim();
}

function extractLiveTags(html) {
  const configs = [...html.matchAll(/gtag\('config','([^']+)'/g)].map((m) => cleanTagId(m[1]));
  const scriptIds = [...html.matchAll(/gtag\/js\?id=([^"'&\\]+)/g)].map((m) => cleanTagId(m[1]));
  const aw = [...new Set([...configs, ...scriptIds].filter((id) => id.startsWith("AW-")))];
  const ga = [...new Set([...configs, ...scriptIds].filter((id) => id.startsWith("G-")))];
  return { aw, ga, hasGtag: /googletagmanager|gtag\(/.test(html) };
}

function extractMeta(html) {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || null;
  const desc =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1] ||
    null;
  const canonical =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1] ||
    null;
  const staleHints = [];
  const blob = `${title || ""} ${desc || ""}`;
  if (/free tutor pro/i.test(blob)) staleHints.push("Free Tutor Pro wording");
  if (/cambridge/i.test(blob) && /edexcel|pearson/i.test(html.match(/<h1[^>]*>([^<]*)<\/h1>/i)?.[1] || "")) {
    staleHints.push("Cambridge wording on Edexcel page title area");
  }
  return { title, description: desc, canonical, staleHints };
}

async function main() {
  const {
    safepayConfigured,
    getSafepayEnv,
    getSafepayKeyDiagnostics,
  } = await import("../src/lib/safepay.ts");
  const { getPaymentsReadiness } = await import("../src/lib/payments-status.ts");

  const diag = getSafepayKeyDiagnostics();
  const readiness = getPaymentsReadiness();

  let safepayPing = { ok: false, detail: "skipped — not configured locally" };
  let safepaySession = null;
  if (safepayConfigured() && !diag.secretLooksLikeApiKey) {
    try {
      const { getSafepayClient, createSafepayHostedCheckout, safepayPublicError } = await import(
        "../src/lib/safepay.ts"
      );
      const client = getSafepayClient();
      void client;
      safepayPing = {
        ok: true,
        detail: `client ready for ${getSafepayEnv()} (${diag.host})`,
      };
      try {
        const session = await createSafepayHostedCheckout({
          amount: 100,
          currency: "PKR",
          orderId: `ops-checklist-${Date.now()}`,
          redirectUrl: `${LIVE}/pricing?checkout=ok`,
          cancelUrl: `${LIVE}/pricing?checkout=cancel`,
        });
        safepaySession = {
          ok: true,
          hasCheckoutUrl: Boolean(session?.url || session?.checkoutUrl),
          env: session?.env || getSafepayEnv(),
          note: "Sandbox hosted session created (no card charged). Human still needed for test-card + one live charge.",
        };
      } catch (sessionErr) {
        safepaySession = {
          ok: false,
          error: safepayPublicError(sessionErr),
        };
        safepayPing = {
          ok: false,
          detail: safepaySession.error,
        };
      }
    } catch (err) {
      safepayPing = {
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  } else if (diag.secretLooksLikeApiKey) {
    safepayPing = {
      ok: false,
      detail: "SAFEPAY_SECRET_KEY looks like sec_ API key — paste Secret key instead",
    };
  } else if (!safepayConfigured()) {
    safepayPing = { ok: false, detail: "SAFEPAY_API_KEY / SAFEPAY_SECRET_KEY missing in this shell" };
  }

  const home = await fetchText(LIVE);
  const liveTags = extractLiveTags(home.text);

  const localLabelsRaw = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABELS?.trim() || "";
  let localLabels = {};
  try {
    localLabels = localLabelsRaw ? JSON.parse(localLabelsRaw) : {};
  } catch {
    localLabels = { _error: "invalid JSON in NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABELS" };
  }

  const labelTemplate = Object.fromEntries(ADS_PRIMARY.map((k) => [k, ""]));
  const missingLabels = ADS_PRIMARY.filter((k) => !localLabels[k]);

  const routes = [];
  for (const path of QA_PATHS) {
    const r = await fetchText(`${LIVE}${path}`);
    routes.push({
      path,
      status: r.status,
      location: r.location,
      ok: r.status === 200 || (r.status >= 300 && r.status < 400),
    });
  }

  const sitemap = await fetchText(`${LIVE}/sitemap.xml`);
  const locCount = [...sitemap.text.matchAll(/<loc>/g)].length;

  const seoSnapshots = [];
  for (const url of SEO_REINSPECT.filter((u) => !u.endsWith("sitemap.xml"))) {
    const page = await fetchText(url);
    seoSnapshots.push({
      url,
      status: page.status,
      ...extractMeta(page.text),
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    liveOrigin: LIVE,
    safepay: {
      configuredLocally: safepayConfigured(),
      env: getSafepayEnv(),
      diagnostics: {
        env: diag.env,
        host: diag.host,
        apiKeyLength: diag.apiKeyLength,
        apiKeyLooksPublic: diag.apiKeyLooksPublic,
        secretLength: diag.secretLength,
        secretLooksLikeApiKey: diag.secretLooksLikeApiKey,
      },
      ping: safepayPing,
      sandboxSession: safepaySession,
      readinessChecks: readiness.checks,
      humanSteps: [
        "In Safepay dashboard: confirm sandbox vs production keys match SAFEPAY_ENV on Vercel Production",
        "Sandbox E2E: open hosted checkout URL (or /pricing) and pay with Safepay test card",
        "Live E2E (production keys only): one small real charge → confirm receipt + entitlement",
        "Confirm webhook endpoint + SAFEPAY_WEBHOOK_SECRET (or CRON_SECRET) on Vercel",
      ],
    },
    googleAds: {
      liveHasGtag: liveTags.hasGtag,
      liveAdsIds: liveTags.aw,
      liveGaIds: liveTags.ga,
      localAdsIdSet: Boolean(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim()),
      localGaIdSet: Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()),
      localLabelKeysPresent: Object.keys(localLabels).filter((k) => k !== "_error"),
      missingPrimaryLabels: missingLabels,
      labelTemplate,
      humanSteps: [
        "Google Ads → Goals → Conversions → create conversion actions for each primary event",
        `Set Vercel NEXT_PUBLIC_GOOGLE_ADS_ID=${liveTags.aw[0] || "AW-…"} (already live if AW present)`,
        "Set NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABELS to JSON map of event→label (template in this report)",
        "Optional: set NEXT_PUBLIC_GA_MEASUREMENT_ID=G-… if GA4 property exists (currently missing on live HTML)",
        "Tag Assistant / Ads preview: fire student_tutor_contact + student_pass_purchase once",
        "Upload creatives from public/ads/* in Google Ads UI if not already linked",
      ],
    },
    searchConsole: {
      sitemapStatus: sitemap.status,
      sitemapLocs: locCount,
      reinspectUrls: SEO_REINSPECT,
      liveMetaSnapshots: seoSnapshots,
      staleHintHits: seoSnapshots.filter((s) => (s.staleHints || []).length > 0),
      humanSteps: [
        "Search Console → Sitemaps → confirm https://www.mytutoringhub.com/sitemap.xml is Submitted/Success",
        "URL Inspection → re-inspect each URL in searchConsole.reinspectUrls (especially Pearson CS + pricing/help)",
        "Request indexing for URLs still showing Free Tutor Pro / Cambridge codes on Edexcel",
      ],
    },
    mobileA11y: {
      routeSmoke: routes,
      failedRoutes: routes.filter((r) => !r.ok),
      automatedProbe: "node scripts/ops-mobile-a11y-probe.mjs --out docs/MTH-MOBILE-A11Y.json",
      humanSteps: [
        "Chrome DevTools device mode (390×844): /, /search, /pricing, /past-papers, /ads, /become-a-tutor",
        "Checks: no horizontal overflow, tap targets ≥44px, focus visible, skip-to-main works",
        "Contrast: primary buttons/text vs backgrounds on hero + pricing cards",
        "Optional: run npx lhci or scripts/lh-matrix.mjs against staging/production",
      ],
    },
    remainingHumanOnly: [
      "Safepay: complete test-card payment in sandbox hosted checkout + one live production charge",
      "Google Ads UI: create conversion actions → paste labels into Vercel NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABELS",
      "Search Console: URL Inspection + Request indexing for reinspectUrls",
      "Manual device a11y pass / Lighthouse accessibility on staging (probe covers overflow/skip/main only)",
    ],
  };

  const out = resolve("docs/MTH-OPS-REMAINING.json");
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    wrote: out,
    safepayConfigured: report.safepay.configuredLocally,
    safepayPing: report.safepay.ping,
    safepaySandboxSession: report.safepay.sandboxSession,
    liveAdsIds: report.googleAds.liveAdsIds,
    liveGaIds: report.googleAds.liveGaIds,
    missingPrimaryLabels: report.googleAds.missingPrimaryLabels.length,
    sitemapLocs: locCount,
    staleHintHits: report.searchConsole.staleHintHits.length,
    routeFailures: report.mobileA11y.failedRoutes.length,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
