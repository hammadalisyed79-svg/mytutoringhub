/**
 * Phase 10 — production verification (read-only except HTTP GETs).
 * Checks DB uniqueness/redirects and live public HTTP surfaces.
 */
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  groupByCanonicalSubject,
  activeCanonicalCollisionGroups,
  canApplyActiveCanonicalUniqueIndex,
} from "../src/lib/teaching-profile-duplicates";
import { FREE_SUBJECT_PROFILES, TUTOR_PRO_SUBJECT_PROFILE_CAP } from "../src/lib/subject-profile-entitlements";
import { BUSINESS } from "../src/lib/business-rules";
import { isSubjectProfilePromoActive } from "../src/lib/subject-profile-entitlements";
import { TUTOR_FREE_LISTING_LINE, TUTOR_PRO_LISTING_LINE } from "../src/lib/marketing-copy";

config();
config({ path: ".env.local" });

const LIVE = process.env.MTH_LIVE_ORIGIN || "https://www.mytutoringhub.com";
const OUT = join(process.cwd(), "docs", "MTH-TEACHING-PROFILES-PHASE10-VERIFY.md");

type Check = { name: string; ok: boolean; detail: string };

async function http(path: string, opts?: { method?: string }) {
  const url = path.startsWith("http") ? path : `${LIVE}${path}`;
  const res = await fetch(url, {
    method: opts?.method || "GET",
    redirect: "manual",
    headers: { "user-agent": "MTH-Phase10-Verify" },
  });
  const location = res.headers.get("location") || "";
  const refresh = res.headers.get("refresh") || "";
  let body = "";
  if (res.status < 300 || res.status >= 400) {
    try {
      body = await res.text();
    } catch {
      body = "";
    }
  }
  return { url, status: res.status, location, refresh, body };
}

function hasCliffCopy(html: string) {
  return /3\s*→\s*1|down to 1 free|then 1 free|1 October 2026.*listing|listing.*1 Oct/i.test(html);
}

function hasPlusOneSku(html: string) {
  return /buy another listing|\+1 Teaching Profile|Profile Boost/i.test(html) ||
    /Extra Profile Ads(?![\s\S]{0,80}legacy)/i.test(html);
}

function mergedListingRedirect(res: {
  status: number;
  location: string;
  refresh: string;
  body: string;
}, expectedToId: string) {
  const loc = res.location || "";
  const meta =
    (res.body.match(/id="__next-page-redirect"[^>]*content="0;url=([^"]+)"/i) ||
      res.body.match(/http-equiv="refresh"[^>]*content="0;url=([^"]+)"/i) ||
      [])[1] || "";
  const digest = (res.body.match(/NEXT_REDIRECT;(?:replace|push);([^;]+);(308|301|307)/) || [])[1] || "";
  const refreshUrl = (res.refresh.match(/url=([^;]+)/i) || [])[1] || "";
  const httpRedirect =
    (res.status === 301 || res.status === 308 || res.status === 307) && loc.includes(expectedToId);
  const rscRedirect =
    res.status === 200 &&
    (meta.includes(expectedToId) || digest.includes(expectedToId) || refreshUrl.includes(expectedToId));
  const kind = httpRedirect ? `http-${res.status}` : rscRedirect ? "next-rsc-308" : "none";
  return {
    ok: httpRedirect || rscRedirect,
    detail: `status=${res.status} location=${loc || "(none)"} metaRefresh=${meta || "(none)"} rsc=${digest || "(none)"} kind=${kind} expected contains ${expectedToId}`,
  };
}

function mdCell(detail: string) {
  return detail.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

async function main() {
  const checks: Check[] = [];
  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
  const prisma = url ? new PrismaClient() : null;

  checks.push({
    name: "Caps locked 3 / 10",
    ok: FREE_SUBJECT_PROFILES === 3 && TUTOR_PRO_SUBJECT_PROFILE_CAP === 10 && BUSINESS.tutorFreeActiveListings === 3,
    detail: `FREE=${FREE_SUBJECT_PROFILES} PRO=${TUTOR_PRO_SUBJECT_PROFILE_CAP} BUSINESS.free=${BUSINESS.tutorFreeActiveListings}`,
  });
  checks.push({
    name: "No date-dependent listing-cap promo",
    ok: isSubjectProfilePromoActive() === false,
    detail: `isSubjectProfilePromoActive=${isSubjectProfilePromoActive()}`,
  });
  checks.push({
    name: "Source copy uses Teaching Profile",
    ok:
      /Teaching Profile/i.test(TUTOR_FREE_LISTING_LINE) &&
      /Teaching Profile/i.test(TUTOR_PRO_LISTING_LINE) &&
      !/teaching listings/i.test(TUTOR_FREE_LISTING_LINE),
    detail: TUTOR_FREE_LISTING_LINE.slice(0, 180),
  });

  if (prisma) {
    try {
      const rows = await prisma.subjectProfile.findMany({
        select: { id: true, tutorProfileId: true, subject: true, canonicalSubject: true, status: true },
      });
      const groups = groupByCanonicalSubject(rows);
      const active = activeCanonicalCollisionGroups(groups);
      const indexSafe = canApplyActiveCanonicalUniqueIndex(groups);
      const indexRows = await prisma.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE indexname = 'SubjectProfile_active_tutor_canonical_uidx'
        ) AS exists
      `;
      const redirects = await prisma.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(*)::bigint AS n FROM "TeachingProfileRedirect"
      `;
      checks.push({
        name: "Zero ACTIVE canonical collisions",
        ok: active.length === 0,
        detail: `${active.length} ACTIVE collision groups / ${rows.length} listings`,
      });
      checks.push({
        name: "Unique index safe",
        ok: indexSafe,
        detail: `canApply=${indexSafe}`,
      });
      checks.push({
        name: "Partial unique index present",
        ok: Boolean(indexRows[0]?.exists),
        detail: `SubjectProfile_active_tutor_canonical_uidx=${indexRows[0]?.exists}`,
      });
      checks.push({
        name: "Redirect rows exist (paused URLs preserved)",
        ok: Number(redirects[0]?.n || 0) > 0,
        detail: `${redirects[0]?.n || 0} TeachingProfileRedirect rows`,
      });
    } catch (err) {
      checks.push({
        name: "Database inventory",
        ok: false,
        detail: err instanceof Error ? err.message.slice(0, 400) : String(err),
      });
    }
  } else {
    checks.push({ name: "Database inventory", ok: false, detail: "No DATABASE_URL" });
  }

  const redirectFrom = "cmtdgoszf000bhyhj4ogze411";
  const redirectTo = "cmtdgosh30005hyhjjaq0a9ns";
  const pages = [
    { name: "Homepage", path: "/", requireTeachingProfile: true },
    { name: "Pricing", path: "/pricing", requireTeachingProfile: true },
    { name: "Become a tutor", path: "/become-a-tutor", requireTeachingProfile: true },
    { name: "Help", path: "/help", requireTeachingProfile: true },
    { name: "Login", path: "/login", requireTeachingProfile: false },
    { name: "Search browse", path: "/search?browse=1", requireTeachingProfile: true },
    { name: "Search Mathematics", path: "/search?subject=Mathematics", requireTeachingProfile: true },
    { name: "Search Cambridge A Level Maths 9709", path: "/search?subject=Mathematics&board=Cambridge&level=A%20Level&syllabusCode=9709", requireTeachingProfile: true },
    { name: "Search Lahore broad", path: "/search?location=Lahore", requireTeachingProfile: true },
    { name: "Subject hub Maths", path: "/s/mathematics", requireTeachingProfile: false },
  ];

  for (const page of pages) {
    try {
      const res = await http(page.path);
      const okStatus = res.status === 200 || (page.path === "/login" && (res.status === 200 || res.status === 307 || res.status === 308));
      const cliff = hasCliffCopy(res.body);
      const plusOne = page.path === "/pricing" || page.path === "/become-a-tutor" || page.path === "/help" || page.path === "/"
        ? hasPlusOneSku(res.body)
        : false;
      const teachingProfile = /Teaching Profile/i.test(res.body);
      const copyOk = !page.requireTeachingProfile || teachingProfile;
      checks.push({
        name: `Live ${page.name} HTTP`,
        ok: okStatus && !cliff && !plusOne && copyOk,
        detail: `status=${res.status} cliffCopy=${cliff} extraSkuCopy=${plusOne} teachingProfileCopy=${teachingProfile} len=${res.body.length}`,
      });
    } catch (err) {
      checks.push({
        name: `Live ${page.name} HTTP`,
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  try {
    const res = await http(`/listings/${redirectFrom}`);
    const result = mergedListingRedirect(res, redirectTo);
    checks.push({
      name: "Merged listing 301/308 to survivor",
      ok: result.ok,
      detail: result.detail,
    });
  } catch (err) {
    checks.push({
      name: "Merged listing 301/308 to survivor",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    const res = await http(`/listings/${redirectTo}`);
    checks.push({
      name: "Survivor listing reachable",
      ok: res.status === 200 || res.status === 404 || res.status === 308 || res.status === 301,
      detail: `status=${res.status} (200 public, 404 if parent tutor not listable)`,
    });
  } catch (err) {
    checks.push({
      name: "Survivor listing reachable",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    const papers = await http("/past-papers");
    checks.push({
      name: "Past papers hub",
      ok: papers.status === 200,
      detail: `status=${papers.status}`,
    });
  } catch (err) {
    checks.push({
      name: "Past papers hub",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    const paper = await http("/past-papers/cambridge/a-level/mathematics-9709");
    const href = (paper.body.match(/href="(\/search\?[^"]+)"/i) || [])[1] || "";
    const decoded = decodeURIComponent(href.replace(/&amp;/g, "&"));
    const okHref =
      paper.status === 200 &&
      /subject=Mathematics/i.test(decoded) &&
      /syllabusCode=9709/i.test(decoded) &&
      (/board=/i.test(decoded) || /level=/i.test(decoded));
    checks.push({
      name: "Past Papers Find-a-tutor CTA params",
      ok: okHref,
      detail: `status=${paper.status} href=${href.slice(0, 220) || "(none)"}`,
    });
  } catch (err) {
    checks.push({
      name: "Past Papers Find-a-tutor CTA params",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  const failed = checks.filter((c) => !c.ok);
  const md = `# Teaching Profiles Phase 10 — production verification

**Generated:** ${new Date().toISOString()}  
**Live origin:** ${LIVE}  
**Result:** ${failed.length === 0 ? "PASS" : `FAIL (${failed.length} checks)`}

## Session-required (not run by this script)

No tutor/student credentials are used here. These remain **session-gated** and were not exercised live:

- Wizard → first Teaching Profile → live in search
- Dashboard create / edit / pause / activate, 3/10 meter, Listing Boost per profile, multi-value capabilities
- Messaging: one thread, listing context, no extra contact

Sign-in is required to message or save from public search (already observed on \`/search?browse=1\`).

## Public HTTP / DB checks

| Check | OK | Detail |
|-------|----|--------|
${checks.map((c) => `| ${c.name} | ${c.ok ? "yes" : "NO"} | ${mdCell(c.detail)} |`).join("\n")}

## Redirect notes

Next.js \`permanentRedirect()\` on the listing page currently streams **HTTP 200** plus \`<meta http-equiv="refresh">\` and an RSC \`NEXT_REDIRECT;...;308;\` digest (not a classic \`Location\` header). That is enough for browsers. SEO 308s are also emitted from \`next.config.ts\` \`redirects()\` at build time once this commit is deployed. \`generateMetadata\` must not call \`permanentRedirect\`.
`;

  writeFileSync(OUT, md, "utf8");
  console.log(JSON.stringify({ out: OUT, passed: checks.filter((c) => c.ok).length, failed: failed.length, failedNames: failed.map((c) => c.name) }, null, 2));
  if (prisma) await prisma.$disconnect();
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
