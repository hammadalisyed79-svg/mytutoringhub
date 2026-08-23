# My Tutoring Hub — Performance + Technical SEO Foundation Report

**For:** ChatGPT re-review  
**Date:** 23 August 2026  
**Sprint:** Performance + Technical SEO Foundation  
**Constraints honored:** no redesign, no business-rule/eligibility/pricing/data changes; SW HTML/RSC policy preserved  

---

## BASELINE PERFORMANCE

Tooling: Lighthouse 12.8 (mobile emulation, headless Chrome) against production.  
PageSpeed Insights API was quota-limited (HTTP 429) — Lighthouse used instead.

### Homepage `/` (pre-change production)

| Metric | Value |
|--------|-------|
| Performance score | **55** |
| LCP | **4.6 s** (hero `<section.hero>` / Unsplash `w=1800` CSS background) |
| FCP | 1.4 s |
| CLS | **0.541** (poor) |
| TBT | 310 ms |
| Speed Index | 1.4 s |
| TTFB (document) | ~240 ms |
| Total bytes | ~1,622 KiB |
| Top opportunity | Prioritize LCP image (~1.9 s); offscreen tutor avatar **~1.2 MB** for ~54px display |

Other routes were queued for PSI but blocked by API quota; homepage findings drove the highest-impact fixes (hero bytes + avatar optimization).

---

## FINAL PERFORMANCE

Lighthouse mobile (same recipe as baseline) against production after deploy `74255d2`:

| Metric | Baseline | Final | Delta |
|--------|----------|-------|-------|
| Score | 55 | **66** | +11 |
| LCP | 4.6 s | **3.8 s** | −0.8 s |
| FCP | 1.4 s | 1.5 s | ~flat |
| CLS | 0.541 | 0.541 | unchanged (deferred) |
| TBT | 310 ms | **130 ms** | −180 ms |
| TTFB | ~240 ms | ~180 ms | improved |
| Total bytes | 1,622 KiB | **398 KiB** | **−1.2 MiB** |
| Offscreen images | ~1,169 KiB wasted | cleared | avatar optimizer |
| LCP image priority | failing | opportunity cleared | preload + smaller hero |


---

## PERFORMANCE CHANGES

| Change | Why |
|--------|-----|
| Hero background `w=1800` → mobile `w=900` / desktop `w=1400` | LCP was the Unsplash CSS background; cut transfer without redesign |
| `HeroImagePreload` on homepage | Discover LCP image earlier (was CSS-only, late) |
| `TutorAvatar` → `next/image` + `sizes` | Below-fold cards were loading **full multi‑MB blob originals** |
| `next.config` `images.remotePatterns` | Enable optimizer for Unsplash + Vercel Blob + Google avatars |
| Font `display: "swap"` + limited weights | Reduce font payload / FOIT risk (brand faces unchanged) |
| `AiSupportWidgetLazy` (`dynamic`, `ssr: false`) | Code-split support chat off critical path |

**Not changed:** service worker HTML/RSC network-only policy (`mth-shell-v3`).

---

## BUNDLE / HYDRATION

| Finding | Action |
|---------|--------|
| Global `AiSupportWidget` (+ chat panel) on every route | Lazy client load |
| `TutorAvatar` was `"use client"` with no hooks | Converted to Server Component + `next/image` |
| `SessionProvider` still wraps app | Kept — auth UX depends on it |
| Many legitimate `"use client"` forms/nav | Left alone (low-risk rule) |

---

## IMAGES / FONTS

### Images
- Hero: responsive Unsplash derivatives + preload  
- Avatars: Next Image optimizer with crop `transform` preserved  
- Profile photo: `priority` on primary public photo only  

### Fonts
- Fraunces + Source Sans 3 via `next/font` (unchanged families)  
- `display: "swap"`  
- Weights limited to those used in UI  

---

## INDEXATION MATRIX

| Route type | Directive | Reasoning |
|------------|-----------|-----------|
| `/` | INDEX | Primary acquisition |
| `/search` (bare) | INDEX | Hub for discovery |
| `/search?...` filters / `page>1` | NOINDEX | Prevent parameter explosion; canonical → `/search` |
| `/subjects` | INDEX | Directory |
| `/s/[subject]` | CONDITIONAL | INDEX if tutors exist; **noindex** if `total===0` |
| `/s/[subject]/[city]` | CONDITIONAL | Same thin-page rule; **not mass-added to sitemap** |
| Active `/tutors/[id]` | INDEX | Public catalogue |
| Inactive `/tutors/[id]` | NOINDEX + not-found UX | Preserved prior regression fix (no name in metadata) |
| `/past-papers` + subject landings | INDEX | Strategic organic |
| Past-paper `?year=&session=&…` | NOINDEX | Canonical clean subject URL |
| `/pricing`, `/how-it-works`, `/become-a-tutor`, `/about`, `/help`, `/contact`, `/free-vs-paid`, `/terms`, `/privacy`, `/ads` | INDEX | Informational / conversion |
| `/login`, `/register` | NOINDEX | `privateMetadata` |
| `/dashboard`, `/messages`, `/settings`, `/assistant`, `/study/*`, `/admin`, `/api/*` | NOINDEX + robots disallow | Private / app |

---

## ROBOTS

`src/app/robots.ts` now uses `siteUrl()` (canonical host).

Disallow: `/admin`, `/api/`, `/dashboard`, `/messages`, `/settings`, `/assistant`, `/study/`, `/profile/edit`, `/register/complete`, `/receipt/`, `/forgot-password`, `/reset-password`.

Allow: `/` (public marketing + catalogue).  
Sitemap: `{siteUrl}/sitemap.xml`.

---

## SITEMAP

**Removed**
- `/login`, `/register`  
- Automatic **subject × city** fan-out (was creating many thin URLs)

**Kept**
- Core static marketing pages  
- `/s/{subject}` hubs  
- Deduped past-paper subject URLs (`publicAvailabilityWhere`)  
- Active tutors only (`publicListedTutorWhere`)  

---

## CANONICALS

Via `pageMetadata()` → `alternates.canonical` on `siteUrl()` host.

| Case | Canonical |
|------|-----------|
| Search filters | Always `/search` |
| Past-paper filters | Clean `/past-papers/{board}/{qual}/{subject}` |
| Subject landings | Exact `/s/...` path |
| Tutor profiles | `/tutors/{id}` when active |

---

## METADATA

| Page | Change |
|------|--------|
| Login / Register | Switched to `privateMetadata` (noindex) |
| Search | `searchResultsShouldNoIndex()` |
| Past-paper subjects | `pastPaperFiltersShouldNoIndex()` |
| Subject landings | `subjectLandingShouldNoIndex(total)` + parallelized data fetches |
| Inactive tutors | Unchanged protection (generic title) |

Business copy helpers retained (3 contacts / Student Pass unlimited — no “message with Student Pass” regression).

---

## STRUCTURED DATA

Retained existing accurate types only:

- Organization + WebSite (homepage)  
- BreadcrumbList / CollectionPage (subject landings)  
- LearningResource (past papers)  
- Person (+ optional AggregateRating **only when published reviews exist**)

No fabricated reviews/ratings/prices added.

---

## PAST PAPER SEO

- Subject pages remain `force-dynamic` server-rendered (crawlable HTML)  
- Titles/descriptions unchanged in substance  
- Filter query params → **noindex**, canonical to subject landing  
- CTA copy untouched  

---

## SUBJECT SEO

- Thin zero-tutor landings: **noindex** (existing behavior, centralized helper)  
- Sitemap no longer mass-publishes city combinations  
- City URLs remain user-reachable for future supply  

---

## TUTOR SEO

- Active: indexable, sitemap-included, Person JSON-LD when shown  
- Inactive: excluded from sitemap; metadata does not advertise display name; public `notFound` behavior preserved  

---

## SEARCH SEO

- Usable/shareable filtered URLs  
- SEO: noindex when any filter/pagination present  
- Canonical always `/search`  

---

## ROUTE/SEO CRAWL

Scripts: `scripts/seo-route-audit.mjs`, existing `scripts/public-link-crawl.mjs`.

Post-deploy expectations:

- No localhost / preview hosts in canonicals  
- Sitemap without login/register / city fan-out  
- Filtered search & paper URLs report `noindex`  

---

## TEST RESULTS

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| `seo-indexation.test.ts` | PASS |
| Eligibility / display-name / availability tests | PASS (frozen rules) |
| `npm run lint` | Pre-existing debt retained (~28 problems) |

---

## PRODUCTION VERIFICATION

Live checks after deploy:

| Check | Result |
|-------|--------|
| Lighthouse `/` mobile | Score 66; LCP 3.8s; **398 KiB** total |
| `/robots.txt` | Allow `/`; disallows include dashboard/api/assistant/study/forgot/reset; Host + Sitemap absolute |
| `/sitemap.xml` | **140** URLs; login/register removed; city fan-out **0**; subjects 95; papers 30; tutors 1 (active-only) |
| `/search?subject=Mathematics` | `noindex,nofollow`; canonical `/search` |
| `/search` bare | `index,follow` |
| `/login` | `noindex,nofollow` |
| Past-paper filtered URL | noindex (canonical clean subject path) |
| Homepage hero | `w=900` + preload present in HTML |
| Localhost/staging in metadata | **0** |
| Mobile QA surface | Nav/search patterns unchanged |

Note: homepage HTML may briefly expose a loading H1 (`My Tutoring Hub`) alongside the real H1 during RSC streaming — deferred cleanup.
---

## REMAINING ISSUES

1. **CLS 0.54** root cause not fully isolated (single large shift without clear node in LH) — deferred dedicated CLS pass (font metrics / streaming announcement / hero paint).  
2. PSI API quota — use Lighthouse CI or keyed PSI next time for multi-route matrix.  
3. Broader route-level Lighthouse matrix (papers/pricing/assistant) deferred after homepage wins land.  
4. Mass SEO content generation **not** started (by design).  

---

## NEXT RECOMMENDED SPRINT

Recommend only — **do not execute automatically:**

1. CLS deep-dive + Lighthouse CI on 8–10 public routes  
2. Controlled subject/city landing expansion **only where tutor supply ≥ N**  
3. Optional self-hosted hero asset (remove Unsplash runtime dependency)  

Stop here.
