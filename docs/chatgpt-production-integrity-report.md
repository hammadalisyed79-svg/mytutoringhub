# My Tutoring Hub — Production Integrity Sprint Report

**For:** ChatGPT re-review  
**Date:** 23 August 2026  
**Objective:** Make production reliably serve ONE current version before further development.

Related prior report: `docs/chatgpt-audit-sprint-report.md`  
Integrity fix commit: **`45b38bd`**  
Audit consistency commit referenced in prior report: **`2c95a4e`** (ancestor of `45b38bd`)

---

## ROOT CAUSE

### Why live pages appeared to mix old and new behavior

Two separate causes were identified. Only one was still true in code after the audit deploy.

#### Cause A — Incomplete surface coverage in the audit sprint (REAL, confirmed live)

The audit fixed **search cards** (`/search`) for:

- duplicate `/hr` + `/ hour`
- `Online · Online`

But **tutor public profiles** (`/tutors/[id]`) still had:

- `formatHourly(...)` (already ends with `/hr`) **plus** a separate `"per hour"` label  
- `place` list item **and** a separate `modes` list item, both able to render `"Online"` → two Online bullets

Live reproduction (before integrity fix) on `/tutors/cmt48u7ix0002ep7trd1b6san`:

- RSC payload contained `?4.96/hr` + `"per hour"`
- `profile-facts-list` contained two children: `"Online"` and `"Online"`

So the audit report overstated “fixed” for rate/availability: search was fixed; **profile was not**.

#### Cause B — Observation timing / client caching (likely for Past Paper “mixed” pages)

At integrity-sprint investigation time (after `634e483` was already production):

| Route | Trust ribbon | CTA (3 contacts / no Pass-required wording) | Paper input |
|-------|--------------|---------------------------------------------|-------------|
| physics-5054 | NEW | NEW | empty value + new placeholder |
| business-7115 | NEW | NEW | empty value + new placeholder |
| chemistry-5070 | NEW | NEW | empty value + new placeholder |
| computer-science-2210 | NEW | NEW | empty value + new placeholder |

All four used the **same** dynamic route:

`src/app/past-papers/[board]/[qualification]/[subject]/page.tsx`

with `export const dynamic = "force-dynamic"` and response headers:

`cache-control: private, no-cache, no-store, max-age=0, must-revalidate`  
`x-vercel-cache: MISS`

There was **no** subject-specific old CTA generator and **no** ISR divergence between those slugs.

Therefore the earlier external “business/chemistry still old while physics new” observation is **not** explained by different code paths per subject. Most likely explanations:

1. **Deploy window** — audit commit `2c95a4e` and report commit `634e483` deployed minutes apart; browsers/edges could briefly show different builds during rollout.
2. **Service worker** — `public/sw.js` previously precached `"/"` HTML into Cache Storage (`mth-shell-v1`) and used **cache-first** for static `.js/.css`. Navigations were network-first (so HTML should refresh), but a sticky old controller + cached shell assets can make a session *feel* inconsistent across revisits until SW updates.
3. **Placeholder confusion** — old `placeholder="42"` looks like a filled value in many browsers; audit changed this to `e.g. 42`, integrity sprint further changed to **`Paper number`**.

### Ruled out

- Different duplicate past-paper page implementations per subject  
- Production alias pointing at a non-main deployment (alias was current production)  
- Next.js ISR serving old HTML for those dynamic past-paper routes (force-dynamic + no-store)

---

## PRODUCTION COMMIT

Verified via Vercel API / inspect:

| Item | Value |
|------|--------|
| Local `HEAD` | `45b38bd058f569bd828bf6ebdd8cb5c29d0726d0` |
| `origin/main` | `45b38bd058f569bd828bf6ebdd8cb5c29d0726d0` |
| Audit commit `2c95a4e` | Present as ancestor on `main` |
| **Production deployment** | `dpl_FkwF7i1XQZdu7DscADwxKycqjNJQ` |
| **Production git SHA** | **`45b38bd058f569bd828bf6ebdd8cb5c29d0726d0`** |
| Production URL / aliases | `mytutoringhub.com`, `www.mytutoringhub.com`, `mytutoringhub.vercel.app` |
| Status | Ready |
| Project | `hammad-fedc/mytutoringhub` |

Production **is** serving the intended current commit after this sprint.

---

## CACHE / DEPLOYMENT

| Mechanism | Finding |
|-----------|---------|
| Vercel production deploy | Succeeded; aliases point at latest Ready deployment |
| Past-paper route config | `force-dynamic` |
| CDN HTML for those pages | `x-vercel-cache: MISS`, `private, no-cache, no-store` |
| ISR / `revalidate` on past-paper subject pages | Not used |
| Service worker | **Was a real client-side risk**; hardened in this sprint |

### Service worker changes (`public/sw.js` → `mth-shell-v3`)

- Removed precache of `"/"` HTML
- HTML / navigations / `.rsc`: **network only**, never written to Cache Storage
- Only offline shell + icons precached
- Activate deletes older cache names
- Client registration forces `update()` and one controlled reload on `controllerchange`

Performance of hashed `/_next/static/` cache-first retained.

---

## DUPLICATE CODE FOUND

| String / pattern | Classification | Action |
|------------------|----------------|--------|
| `TrustRibbon` in `layout.tsx` | **A legitimate** single global source | Kept |
| Footer “Identity verification available” | **A legitimate** secondary mirror | Kept (aligned) |
| `Verified tutor profiles` in app code | **E was active**, now gone from ribbon | Already removed in audit |
| `message with Student Pass` in live HTML | **Not present** on checked past-paper pages after `634e483+` | Confirmed |
| `PastPaperTutorCta` | **A legitimate** single CTA source for subject pages | Confirmed used |
| `formatHourly` + `"per hour"` on `/tutors/[id]` | **B stale duplicate UI** (active production bug) | **Fixed** |
| `place` + `modes` both rendering Online | **B stale duplicate UI** | **Fixed** via `formatTutorAvailability` |
| Search cards `/ hour` | Already fixed in audit | Verified |
| `placeholder="42"` | Misleading blank-state UX | Changed to `Paper number` |
| `Budget per hour (PKR…)` in NewAdForm | **A legitimate** form label (not rate formatter) | Left |
| `No lesson commission` in some meta/about strings | **A/C acceptable variant** near “No commission on lesson fees” | Not rewritten this sprint |

No second TrustRibbon component and no subject-specific old past-paper CTA templates were found.

---

## FIXES MADE

| File | Change |
|------|--------|
| `src/app/tutors/[id]/page.tsx` | Removed `per hour` labels; single `formatTutorAvailability` fact line |
| `src/lib/tutor-catalog.ts` | Clarified online-only → single `"Online"` |
| `src/lib/tutor-catalog.availability.test.ts` | Added unit coverage |
| `public/sw.js` | `mth-shell-v3`; never cache HTML documents |
| `src/components/ServiceWorkerRegister.tsx` | Force update + one reload on new controller |
| `src/app/past-papers/.../page.tsx` | Paper input placeholder → `Paper number` |
| `src/app/past-papers/page.tsx` | Same placeholder |

Pushed to `origin/main` as **`45b38bd`**.

---

## LIVE URL VERIFICATION

Fetched from `https://www.mytutoringhub.com` after production showed SHA `45b38bd` (no-cache headers).

| URL | Result |
|-----|--------|
| `/` | **PASS** — Identity verification available; No commission on lesson fees |
| `/how-it-works` | **PASS** |
| `/search` | **PASS** — trust wording; rate formatter without extra `/ hour` on cards |
| `/tutors/cmt48u7ix0002ep7trd1b6san` | **PASS** — `/hr` present; **no** `per hour`; facts show single `Online` |
| `/past-papers/cambridge/o-level/physics-5054` | **PASS** |
| `/past-papers/cambridge/o-level/business-7115` | **PASS** |
| `/past-papers/cambridge/o-level/chemistry-5070` | **PASS** |
| `/past-papers/cambridge/o-level/computer-science-2210` | **PASS** |
| `/pricing` | **PASS** |
| `/terms` | **PASS** |

Past-paper PASS criteria used:

- Identity verification available  
- not “Verified tutor profiles”  
- not “message with Student Pass”  
- “3 new tutors” CTA rule  
- “Paper number” placeholder  
- Study assistant link  

---

## TEST RESULTS

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **Pass** |
| `npm run build` | **Pass** |
| `npx tsx src/lib/business-rules.test.ts` | **Pass** |
| `npx tsx src/lib/tutor-catalog.availability.test.ts` | **Pass** |
| `npm run lint` | **Fails** with pre-existing project lint debt (not introduced as build blockers). Examples previously noted: SiteNav `set-state-in-effect`, tutor-badges `prefer-const`, assorted unused-var warnings. |

---

## PRODUCTION ACCEPTANCE (§9) STATUS

1. Public trust ribbons new wording → **PASS**  
2. Business/Chemistry/CS/Physics same CTA rules → **PASS**  
3. No “message with Student Pass” as required-for-all → **PASS**  
4. Paper/component blank not populated with 42 → **PASS** (`value=""` / placeholder Paper number)  
5. Tutor profile not `/hr` + `per hour` → **PASS** after `45b38bd`  
6. Online-only not duplicated → **PASS** after `45b38bd`  
7. Search and profile formatting agree on shared helpers → **PASS**  
8. Homepage/footer/how-it-works trust agree → **PASS**  
9. Production serving intended commit → **PASS** (`45b38bd`)  
10. Routes no longer return old audit-pre copy on server fetch → **PASS**

**Note for returning visitors:** one hard refresh (or waiting for SW `mth-shell-v3` takeover) may still be needed if an old service worker controller was installed before this deploy.

---

## NEXT RECOMMENDED SPRINT

**Do not execute now.** Suggested next pass only:

1. Optional one-time admin/job to re-run `syncTutorBadges` for all tutors (incomplete `active` profiles).  
2. Light copy sweep of email nurture templates for residual old phrasing.  
3. Then—and only then—mobile / a11y / performance work from the original audit backlog.

---

## SUMMARY

Production was already on the audit lineage (`634e483` including `2c95a4e`) when investigated; past-paper subject pages were **already consistent** under one dynamic route with no CDN/ISR split. The genuine outstanding integrity defect was **tutor profile rate/availability duplication**, plus a **service worker** that could keep clients feeling “mixed” after deploys. Those are fixed in **`45b38bd`**, verified live, and this sprint stops here.
