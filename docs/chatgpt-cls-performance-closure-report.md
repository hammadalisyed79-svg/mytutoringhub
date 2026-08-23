# CLS Deep-Dive + Multi-Route Performance Closure Report

**Date:** 2026-08-23  
**Production:** https://www.mytutoringhub.com  
**Commits:** `c97839a`, `0b9ce50`

---

## CLS ROOT CAUSE

**Primary cause (evidence-based): RSC streaming loading boundary on the homepage.**

### Evidence

1. **Repeatable Lighthouse CLS (before fix, production mobile):**
   - Run 1: **CLS 0.541** (Performance 68)
   - Run 2: **CLS 1.081** (≈ 2 × 0.541; Performance 60)
   - Run 3: **CLS 1.081** (Performance 63)
   - Lighthouse reported **one dominant layout-shift contribution of ~0.541** per window (runs 2–3 accumulated a second equal shift under throttling).

2. **Mid-stream DOM / accessibility capture** (browser navigate during cold load) showed **two H1s at once**:
   - Loading H1: `My Tutoring Hub` (from `src/app/loading.tsx` → `PageLoading`)
   - Real H1: `Private tutoring, elevated.` (homepage hero)
   - Loading lead text `Loading…` was also present while homepage sections streamed in.

3. **Geometry mismatch:**
   - Loading UI: short `.page` + title/lead (footer often still in the first viewport).
   - Final UI: tall `.hero.hero-findtutor` composition.
   - Replacing a short main with a tall hero **pushes visible siblings (notably the footer)** → CLS ≈ 0.5+.

4. **Not the primary causes (ruled down with evidence):**
   - **Fonts:** `next/font` Fraunces + Source Sans 3 with `display: swap`; no Lighthouse unsized-images; after loading fix, homepage CLS went to **0** without changing brand fonts — font swap was not the 0.541 driver.
   - **Header auth:** `SiteHeader` is a server component using `auth()` — no logged-out → logged-in client height jump on public anonymous LH runs.
   - **Images:** no unsized-images audit hits; avatar/`next/image` + hero CSS background preserved.
   - **AI support widget:** lazy, `ssr: false`, floating — does not push document flow.
   - **Tutor section:** server-rendered featured tutors; not the 0.541 single-shift signature.

### Approximate CLS contribution (homepage, before fix)

| Source | Approx. share |
| --- | ---: |
| Streaming loading H1 / short → tall hero (footer push) | **~0.54 (≈100% of measured CLS)** |
| Font swap | ~0 (not material after isolation) |
| Header auth hydration | ~0 |
| Tutor section async | ~0 |
| Other widgets | ~0 |

---

## CLS BEFORE / AFTER

### Before (production homepage)

| Run | Perf | CLS | LCP | FCP | TBT |
| --- | ---: | ---: | --- | --- | --- |
| 1 | 68 | **0.541** | 3.6s | — | — |
| 2 | 60 | **1.081** | 3.9s | 1.4s | 200ms |
| 3 | 63 | **1.081** | 3.6s | — | — |

Prior sprint baseline: Perf 66, CLS **0.541**, LCP 3.8s, TBT 130ms, ~398 KiB.

### After fix (production homepage, 3 runs)

| Run | Perf | CLS | LCP | FCP | TBT | Transfer |
| --- | ---: | ---: | --- | --- | --- | --- |
| 1 | **88** | **0.000** | 3.8s | 1.4s | 100ms | 385 KiB |
| 2 | **88** | **0.000** | 3.6s | 1.4s | 170ms | 393 KiB |
| 3 | **87** | **0.000** | 3.7s | 1.4s | 180ms | 399 KiB |

**Target met:** CLS ≤ 0.10 (achieved **0.00** on all three runs).

Cold-load observer (`scripts/cls-capture.mjs`) after deploy: **no layout-shift entries**; final single H1 = `Private tutoring, elevated.`

---

## FIXES

| File | Change |
| --- | --- |
| `src/app/(home)/page.tsx` | Homepage moved into `(home)` route group (URL unchanged). |
| `src/app/(home)/loading.tsx` | Homepage-only Suspense fallback. |
| `src/components/HomeLoading.tsx` | Hero-matching skeleton (same `.hero.hero-findtutor` shell, **no H1**). |
| `src/components/PageLoading.tsx` | Title is `<p class="page-title">`, not `<h1>` (avoids competing headings while streaming). |
| `src/app/loading.tsx` | Generic non-home fallback only (no “My Tutoring Hub” H1). |
| `src/app/globals.css` | Home skeleton styles; hero H1 `min-height` reserve; trust-ribbon `min-height`; moderated `.page-loading` height. |
| `src/app/layout.tsx` | Explicit `adjustFontFallback: true` on Fraunces + Source Sans 3. |
| `src/app/subjects/loading.tsx` | Subjects-specific loading title (follow-up after subjects CLS flag). |
| `scripts/cls-capture.mjs` | Temporary diagnostic for layout-shift capture. |

**Intentionally unchanged:** brand fonts, SW HTML/RSC network-only (`mth-shell-v3`), hero preload, TutorAvatar optimization, SEO indexation matrix, business rules, tutor eligibility, pricing.

---

## MULTI-ROUTE LIGHTHOUSE

Mobile, production, same recipe (`--form-factor=mobile`, throttled Lighthouse).

| Route | Perf | FCP | LCP | CLS | TBT | Speed Index | Transfer |
| --- | ---: | --- | --- | ---: | --- | --- | --- |
| `/` (run 1) | 88 | 1.4s | 3.8s | **0** | 100ms | 1.4s | 385 KiB |
| `/` (run 2) | 88 | 1.4s | 3.6s | **0** | 170ms | 1.4s | 393 KiB |
| `/` (run 3) | 87 | 1.4s | 3.7s | **0** | 180ms | 1.4s | 399 KiB |
| `/search` | 95 | 1.4s | 2.9s | 0 | 90ms | 1.4s | 321 KiB |
| `/subjects` (after follow-up) | **94** | — | 3.0s | **0.054** | 80ms | — | — |
| `/subjects` (pre follow-up) | 78 | 1.2s | 3.0s | 0.295 | 120ms | 1.2s | 323 KiB |
| Active tutor `/tutors/cmsx3iyd20002hekfp2q2g9r7` | 95 | 1.2s | 2.9s | 0 | 70ms | 1.2s | 296 KiB |
| `/past-papers` | 94 | 1.2s | 2.9s | 0 | 110ms | 1.2s | 298 KiB |
| Physics `/past-papers/cambridge/igcse/physics-0625` | 82 | 1.4s | 3.1s | 0 | **460ms** | 1.4s | 330 KiB |
| `/pricing` | 85 | 1.2s | 3.3s | 0 | 320ms | 1.2s | 355 KiB |
| `/how-it-works` | 96 | 1.2s | 2.7s | 0 | 50ms | 1.2s | 287 KiB |
| `/become-a-tutor` | 91 | 1.2s | 3.2s | 0 | 150ms | 1.2s | 355 KiB |

`/assistant` excluded (NOINDEX + robots disallow) per scope.

---

## PERFORMANCE OUTLIERS

| Route | Flag | Notes |
| --- | --- | --- |
| Physics past-paper subject | TBT **460ms** (>400ms) | Large server HTML for paper lists (~800KB HTML document observed); crawlability kept. **Deferred** — not a new CLS sprint. |
| `/subjects` (initial matrix) | CLS **0.295** (>0.25) | Shared tall generic loading vs directory content. **Fixed** in follow-up → CLS **0.054**. |
| Homepage LCP | ~3.6–3.8s | Still above “ideal” but under 4.0s catastrophic bar; hero image/LCP work from prior sprint retained. No further speculative LCP pass. |

No route with Performance &lt; 50. No unexplained catastrophic regression.

---

## PAST PAPER PERFORMANCE

- Index `/past-papers`: strong (Perf 94, CLS 0, ~298 KiB).
- Physics subject page: Perf 82, CLS 0, LCP 3.1s; **TBT 460ms** and very large HTML payload for paper rows (SEO/crawlability prioritized over trimming list markup).
- Filters remain server-readable; no conversion to client-only lists.
- **No further optimization in this sprint** beyond measurement.

---

## SEARCH PERFORMANCE

- `/search`: Perf **95**, CLS **0**, LCP 2.9s, TBT 90ms.
- Filtered search correctly **noindex, nofollow** (sanity check).
- Interactive filters/hydration acceptable; no conversion to static-only search.

---

## REGRESSION CHECKS

| Area | Result |
| --- | --- |
| Mobile layout | Hero skeleton mirrors final geometry; no redesign |
| Business rules / pricing / eligibility | Untouched |
| Tutor eligibility / suspicious-name | Untouched; inactive tutor `cmszs2z0n0006rfenbufw47yh` → **noindex, nofollow**, “Tutor not found” |
| SW HTML/RSC | Still network-only (`mth-shell-v3`, navigate/RSC bypass cache) |
| Hero preload / TutorAvatar / lazy AI widget | Preserved |
| Homepage canonical | `https://www.mytutoringhub.com` + `index, follow` |
| Filtered search | `noindex, nofollow` |
| Physics past paper | canonical + `index, follow` |
| robots.txt | `/assistant` disallowed; sitemap present |
| sitemap | No login/register/assistant fan-out |

---

## TEST RESULTS

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | **Pass** |
| `npm run build` | **Pass** |
| `npm run test:past-papers` | **Pass** |
| `npm run test:safepay` | **Pass** |
| `seo-indexation` / `display-name` / `tutor-public-eligibility` / `business-rules` tests | **Pass** |
| `npm run lint` | **29 problems (9 errors, 20 warnings)** — **pre-existing debt**, none introduced by CLS files |

---

## PRODUCTION DEPLOYMENT

- Pushed to `origin/main`: `c97839a`, `0b9ce50`
- Verified live markers: `home-loading-skel` / subjects loading lead on production HTML
- Post-deploy Lighthouse matrix run against **production** (not localhost)
- Final homepage CLS confirmation: **0 / 0 / 0**

---

## ENGINEERING STATUS

**General engineering optimization is CLOSED.**

Homepage CLS root cause identified with evidence, fixed safely, verified with ≥3 production Lighthouse runs, and a multi-route performance matrix completed. Remaining items (Physics TBT / large HTML) are documented and should only be revisited with **field data / product priority**, not another speculative audit sprint.

---

## NEXT RECOMMENDED BUSINESS SPRINT

**Marketplace growth — do not execute here:**

1. Acquire and activate more publicly listable tutors (supply).
2. Student acquisition campaigns into search + past papers.
3. Activation loops: complete profile → first message → first lesson arranged.
4. Measure real Core Web Vitals from analytics/RUM; only then reopen performance work if field CLS/LCP regresses.

---

*End of closure report.*
