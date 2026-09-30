# MTH — Production Stabilization Report

**Date:** 1 October 2026  
**Scope:** Confirmed production gaps only — no redesign, no new plans/prices, no destructive DB ops.

---

## 1. P0 issues fixed

| Issue | Fix |
|-------|-----|
| Expired Tutor Pro Launch offer still public / grantable via UTC window | Promo hard-stopped after 30 Sep 2026 Asia/Karachi; `promoEnabled: false`; public copy no longer markets complimentary Tutor Pro |
| Science search / rates could collide with Computer Science | Search SQL uses exact subject/canonical equals; average-rate helpers use `sameCanonicalSubject` |
| Similar rail could under-match exam-prefixed subjects | Similar query expands via `canonicalTeachingSubject` |
| Pearson Edexcel CS SEO pages showing Cambridge codes (0478/2210/9618) | Cambridge syllabus guessing + backfill limited to Cambridge boards only |

---

## 2. Commercial inconsistencies fixed

- Public Tutor Pro messaging is list-price only (`TUTOR_PRO_PUBLIC_LINE`).
- Student/Tutor feature copy aligned to Free=3 contacts / Free=1 Teaching Profile / Pro=10.
- Student Request wording standardized toward **Tutor Requests** / **Post a Tutor Request**.
- Reviews copy: moderated before publication; messaging-based eligibility; no fabricated lesson verification.
- Email verification copy: new conversations need verification; tutors may reply to inbound before verify (matches `canReplyInConversation`).
- Safepay public wording: live when configured; otherwise “not configured” (no perpetual “when live” on help when keys exist).
- Homepage count: `pastPaper.count(public)` labeled **Exam resources** (includes QP/MS/etc.), not “Past Papers” alone.
- Past-paper sign-in copy: no “free Student Pass downloads”; uses included Pass/Pro downloads language.

Prices unchanged (Pass 1999 / Pro 3499 / Tutor Pro 1499 / Boost 999·9590 / Verify 2999 / paper 100 PKR).

---

## 3. Search relevance changes

- `search-tutors.ts`: subject filter uses `equals` on `subject` / `canonicalSubject` (not substring).
- Post-filter `listingMatchesExpandedSubject` retained.
- `averageRateForSubject` / `averageRatesBySubject` canonical-safe.
- Regression tests: Science ≠ Computer Science; A Level Science expands without CS.

---

## 4. Past Paper integrity changes

- `subjectSeoSlug` does not stamp Cambridge codes onto non-Cambridge boards.
- `resolveSeoCurriculum` ignores Cambridge code suffixes on non-Cambridge board slugs.
- SEO page Cambridge backfill only runs for Cambridge boards.
- Tests cover Pearson GCSE CS slug without `0478` and Cambridge IGCSE with `0478`.

---

## 5. Taxonomy findings

- Added **read-only** script: `scripts/taxonomy-audit-readonly.ts` (`--write` → `docs/MTH-TAXONOMY-AUDIT-READONLY.json`).
- No automatic deletes performed.
- Run against production DB before any cleanup. Expected classes: paperish Subject names, paperish Teaching Profile labels, duplicate catalog names.

---

## 6. Payment / purchase flows verified

| Flow | Status | Evidence |
|------|--------|----------|
| Tutor Pro complimentary grant | **Off** | `resolvePlan` → `isComplimentary: false`, charge PKR 1499 |
| Incomplete Safepay rows | Expected abandoned checkouts | `TRACKER_STARTED` = not paid; Recover correctly refuses |
| Guest past-paper purchase | **Implemented** | `GuestPaperCheckout` → `/api/past-papers/checkout` → Safepay → token download; activation is server-side |
| Browser-only activation | Not used | Complete/webhook/reconcile paths require Safepay paid state |

**Not re-tested live against Safepay production in this pass** (no end-to-end card charge executed here).

---

## 7. Copy / terminology fixes

- Launch offer removed from public FAQs / become-a-tutor / help / AI support acquisition lines.
- Trust ribbon: “Message tutors directly”.
- Markets claim: “50+ tutoring markets”.
- Request ads → Tutor Requests on pricing, terms, assistant, hub-points, free-vs-paid.

---

## 8. Mobile / accessibility

- No layout redesign. Touched surfaces are copy/query/logic only.
- Full mobile/a11y sweep of every page **not** re-run in this pass — treat as remaining QA item.

---

## 9. Tests actually run

- `npx tsc --noEmit` (taxonomy script type errors fixed; suite exit 0 after capability tests)
- `src/lib/search-tutors.test.ts` — ok
- `src/lib/search-capabilities.test.ts` — ok
- `src/lib/teaching-profile-subject.test.ts` — ok
- `src/lib/past-papers/past-papers.test.ts` — ok
- `src/lib/public-commercial-consistency.test.ts` — ok
- `src/lib/analytics-conversions.test.ts` — ok

Production `next build` **not** run in this pass.

---

## 10. Remaining genuine blockers

| Issue | Impact | Next action | Status |
|-------|--------|-------------|--------|
| Confirm Vercel `NEXT_PUBLIC_GA_MEASUREMENT_ID` + Ads conversion labels | Ads optimization | Tag Assistant; map labels in Ads UI | **Partial** — live site loads gtag/`AW-`; conversion label map + creatives still manual |
| Upload `public/ads/*` creatives | Spend efficiency | Google Ads UI + repo assets | Open |
| Taxonomy paperish subjects | Catalog quality | Audit run; picker filter shipped; 1 ACTIVE paperish profile paused | **Mostly done** — 11 orphan Subject rows (0 papers) still await curated delete |
| Incomplete Safepay inventory | Admin noise | Inventory + auto-revoke ≥7d unpaid via daily cron / script | **Automated** — 4 stale TRACKER_STARTED canceled; recent Incomplete left |
| Teaching Profiles vs plans | Cap integrity | Daily cron: enforce Pro caps + profile-vs-plan audit (hard fail = Pro over-cap) | **Automated** — Free=1 / Pro=10; Pro over-cap=0; 6 Free grandfathered |
| Live Safepay E2E guest paper + plan purchase | Payment confidence | One sandbox + one live test charge | Open (manual) |
| Google recrawl for stale SERP | Trust in snippets | Sitemap healthy (487 URLs); legacy Google/Bing ping retired; use Search Console | **Partial** — GSC re-inspect still manual |
| Referral +1 contact | Growth | Removed dead path; Hub Points attribution remains | **Closed** |
| Full mobile/a11y pass | Launch polish | Staging checklist | Open |

Ops scripts added/updated this pass:
- `scripts/taxonomy-audit-readonly.ts` (`--write`, `--pause-paperish-profiles`)
- `scripts/incomplete-payments-audit-readonly.ts` (`--write`)
- `scripts/audit-profile-vs-plan.ts` (`--write`)
- `scripts/revoke-stale-incomplete.ts` (`--apply`, `--min-age-days=7`)
- `scripts/ping-sitemap.mjs` (sitemap health + optional IndexNow)

Daily cron `/api/digests/onboarding` now: expire subs → enforce Teaching Profile caps (paginated) → profile-vs-plan audit → revoke stale unpaid Incomplete → nurture digest.

---

## Stop condition

No redesign, no new products/prices, no destructive DB changes. Stabilization pass complete — move to controlled promotion once ops blockers above are cleared.
