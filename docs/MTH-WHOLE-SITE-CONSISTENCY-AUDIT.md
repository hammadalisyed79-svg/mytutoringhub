# MTH — Whole-site public consistency audit

**Date:** 2026-08-31  
**Repo:** `C:\Tutor`  
**Scope:** Safe public commercial / terminology consistency only  
**Out of scope:** Teaching Profiles schema/migration, search architecture rewrite, homepage redesign, Prisma changes, lesson payments  

**Related (not reopened):** [`MTH-TEACHING-PROFILES-PLAN.md`](./MTH-TEACHING-PROFILES-PLAN.md) (LOCKED), [`MTH-MARKETPLACE-V2-TRACKER.md`](./MTH-MARKETPLACE-V2-TRACKER.md), [`MTH-MARKETPLACE-V2-FINAL-IMPLEMENTATION-REPORT.md`](./MTH-MARKETPLACE-V2-FINAL-IMPLEMENTATION-REPORT.md)

---

## A. Executive verdict

**WHOLE-SITE CONSISTENCY PASS — COMPLETE**

Public surfaces now match the locked commercial model: Tutor Free = **3** Teaching Profiles permanently; Tutor Pro = **10**; Listing Boost = one-time **30-day** visibility (PKR **999** base); Priority Verification Review = queue priority only; Student Free = **3** unique tutors/month. Retired Free listing-cap cliffs were already gone; this pass fixed remaining **add-on billing mislabeling** (`/mo` / “Billed monthly”), **false auto-renew** claims vs Safepay one-shot checkout, and terminology drift.

Prisma schema / database were **not** changed. Locked Teaching Profiles plan was **not** reopened.

---

## B. Method

1. Read locked V2 + Teaching Profiles docs (commercial SoT only; no plan reopen).  
2. Repo-wide phrase search for stale commercial terms (2 free, October cliffs, Tutor Basic, Extra/Unlimited as current products, `/mo`, auto-renew, Stripe leakage, etc.).  
3. Classify matches A–E; change only category A with SoT support.  
4. Verify checkout: Safepay `mode: "payment"` (no recurring mandate).  
5. Wire public copy to `BUSINESS` / plans / entitlements helpers where safe.  
6. Add `public-commercial-consistency.test.ts` + run commercial / search / SEO / typecheck / build.

---

## C. Defects found

| ID | Severity | Defect | Classification |
|----|----------|--------|----------------|
| A1–A4 | Critical | Listing Boost & Priority Verification shown as `/mo` + “Billed monthly” on Pricing; ProfileBoostPanel “PKR 999/mo one-time” | A |
| A5 | High | Receipt always “Monthly subscription — billed monthly” for add-ons | A |
| A6–A7 | High | SubscribeButton + Terms implied auto-renew; Safepay is one-shot `payment` | A |
| A8 | High | VERIFIED_TUTOR SubscribeButton missing `oneTime` | A |
| A9–A10 | Medium | Boost copy omitted one-time + “does not increase capacity” | A |
| A11–A12 | Medium | Dashboard summary treated AD_BOOST as “Tutor Pro” | A |
| A14–A23 | Low | Terminology: tutor listings/ads, Verified tutor FAQ title, hardcoded contact “3”, AuthLayout grammar | A |
| — | — | 2→0 / 3→1 October Free-cap cliffs on public pages | Already absent (D) |
| — | — | Extra/Unlimited as public sell cards | Already absent; legacy OK (C) |
| — | — | Stripe field jargon on Privacy | Already absent (D) |
| — | — | Tutor Pro complimentary until 30 Sep 2026 | Correct keep (D) |

---

## D. Defects fixed

- One-time price path: `formatPlanPrice(..., "once")`, `addOnBillingFootnote`, Pricing `PlanPrice` for `isAddOn`.  
- SubscribeButton: `oneTime` for add-ons; subscription trust line no longer claims renewal by default.  
- Terms §3 aligned with Refund: automatic renewal not assumed.  
- Receipt branches one-time vs period purchase.  
- Plans: Boost + Priority Review features state one-time / no capacity / no auto-verify.  
- `getPlanDashboardSummary`: Boost ≠ Tutor Pro; Priority Review copy corrected.  
- Help / About / How-it-works / Become-a-tutor / free-vs-paid / Auth / banners: Teaching Profile terminology + Identity Verified precision.  
- Marketing + homepage contact/cap lines consume `BUSINESS` SoT.

---

## E. Files changed

| Area | Files |
|------|--------|
| Pricing / money | `src/lib/currency.ts`, `src/lib/payments-status.ts`, `src/lib/plans.ts`, `src/components/PricingPlansClient.tsx`, `src/components/ProfileBoostPanel.tsx`, `src/components/SubscribeButton.tsx`, `src/app/receipt/[id]/page.tsx` |
| Entitlements display | `src/lib/plan-limits.ts`, `src/lib/free-vs-paid.ts`, `src/lib/marketing-copy.ts` |
| Public pages | `src/app/terms/page.tsx`, `src/app/help/page.tsx`, `src/app/about/page.tsx`, `src/app/how-it-works/page.tsx`, `src/app/become-a-tutor/page.tsx`, `src/app/(home)/page.tsx` |
| Shared UI | `src/components/AuthLayout.tsx`, `src/components/PaymentsComingSoonBanner.tsx`, `src/components/FreeVsPaidComparison.tsx`, `src/components/EmailVerificationBanner.tsx`, `src/components/PointsWalletPanel.tsx`, `src/components/HubPointsShareActions.tsx` |
| Tests / scripts | `src/lib/public-commercial-consistency.test.ts`, `package.json` (`test:commercial`) |
| Report | `docs/MTH-WHOLE-SITE-CONSISTENCY-AUDIT.md` |

**Not changed:** `prisma/schema.prisma`, migrations, Teaching Profiles plan docs, homepage visual design, search architecture.

---

## F. Commercial model verified (SoT)

| Rule | Source | Public status |
|------|--------|---------------|
| Tutor Free = 3 ACTIVE Teaching Profiles permanently | `FREE_SUBJECT_PROFILES` / `BUSINESS.tutorFreeActiveListings` | Pass |
| Tutor Pro = 10 | `TUTOR_PRO_SUBJECT_PROFILE_CAP` | Pass |
| Listing-cap promo retired (`isSubjectProfilePromoActive() === false`) | entitlements | Pass |
| Tutor Pro price promo to 30 Sep 2026 | `plans.ts` `TUTOR_BASIC.promoUntil` | Pass (kept; separate from Free cap) |
| Listing Boost PKR 999, 30 days, one-time, no capacity | `AD_BOOST` | Pass |
| Priority Verification Review PKR 2999, queue only | `VERIFIED_TUTOR` | Pass |
| Student Free 3 unique tutors/month | `BUSINESS.studentFreeContactsPerMonth` | Pass |
| No public +1 profile SKU | `PUBLIC_ADDON_PLAN_IDS` | Pass |
| Extra / Unlimited legacy only | plans + Pricing lead | Pass |
| 0% lesson commission | `BUSINESS.noLessonCommission` | Pass |

---

## G. Page-by-page results

| Route | Result |
|-------|--------|
| `/` | Wording only (caps/contacts via SoT). **Visual design frozen — no redesign.** |
| `/pricing` | Add-ons one-time; Free 3 / Pro 10; legacy packs not sold |
| `/free-vs-paid` | Correct; Boost no-capacity + one-time clarified |
| `/about` | Promo vs Free cap separated; Boost capacity clarified |
| `/help` | Cliffs absent; Identity Verified FAQ; payments one-time vs period |
| `/how-it-works` | Tutor Pro + Teaching Profiles; Identity Verified wording |
| `/become-a-tutor` | Steps compatible with live wizard; Teaching Profile language |
| `/terms` | Auto-renew assumption removed; Free 3 / Pro 10 / Boost one-time |
| `/privacy` | Already provider-neutral; no Stripe field leakage |
| `/refund` | Already correct hedge — left intact |
| `/search` | Audit only — functions; architecture deferred |
| Past papers | No commercial cliff defects; currency localization expected |
| Tutor / listing public pages | No Free-cap cliffs; URLs `/tutors/{id}` `/listings/{id}` retained |

---

## H. Verification copy

Allowed language in use: **Identity Verified**, **Priority Verification Review**.  
Explicit: payment never auto-awards badge; Identity Verified ≠ qualification / degree / background / quality approval.

---

## I. Pricing / billing

- Core plans: monthly / annual footnotes unchanged.  
- Add-ons: “One-time purchase” / “30-day boost” — **not** `/mo` or “Billed monthly”.  
- Safepay checkout remains `mode: "payment"` (no automatic recurring mandate).  
- Currency conversion still uses visitor currency helpers (no hardcoded PKR in localized UI).

---

## J. Terms / privacy / legal flags

| Item | Action |
|------|--------|
| False “subscriptions renew unless cancelled” | Fixed to match refund / implementation |
| Broad legal rewrite / safeguarding policy | **Not done** (deferred / legal) |
| Minors / parental consent, retention schedules, ID document handling | Already flagged on Privacy §9 — **legal review** |
| Child Safety & Safeguarding Policy | Does not exist publicly — correctly not claimed |

---

## K. Search (audit only — EXPECTED / DEFERRED)

Current live search still listing/Teaching Profile based. Future plan items **not** implemented in this task:

- Subject-based multi-value capability matching completion  
- Broad-search max 2 cards per tutor/page (may already partially exist from earlier phases — not reworked here)  
- Schema uniqueness migrations  

No unrelated search regressions introduced by this copy pass.

---

## L. SEO / metadata

No “2 free” / October Free-cap / Tutor Basic claims found in audited public metadata helpers.  
URLs `/listings/{id}` and `/tutors/{id}` retained. No SEO architecture migration.

---

## M. Tests / build

| Check | Status |
|-------|--------|
| `npx tsx src/lib/public-commercial-consistency.test.ts` | Pass |
| `npm run test:commercial` | Pass |
| `subject-profile-entitlements` / `business-rules` / `subscription-entitlements` | Pass |
| `marketplace-p0-regression` / `seo-indexation` / `verification-queue` | Pass |
| `search-dedupe` / `search-tutors` | Pass |
| `npx tsc --noEmit` | Pass |
| Production `npm run build` | See section P / CI after push |

Assertions cover Free 3, Pro 10, no 2→0 / 3→1 cliffs, no +1 SKU, Boost no capacity, student 3 contacts, Priority Review no auto-verify, legacy IDs not public primary, Pro promo ≠ Free cap, add-ons not `/mo`.

---

## N. Visual / responsive smoke

Copy-length changes on pricing add-on footnotes, help FAQ, terms, become-a-tutor steps. No layout redesign. Risk: longer “one-time / 30-day” footnotes wrapping on 320–390px — expected readable wrap; no intentional card/grid changes. Full multi-viewport browser pass should follow deploy (agent session: code + unit tests primary evidence).

---

## O. Deferred Teaching Profiles / product items

Per locked plan — **not** started in this task:

- Prisma multi-value capability model changes beyond what already shipped  
- Onboarding wizard removal of master bulk subject picker  
- Search card architecture product changes beyond current live behaviour  
- Lesson payments / escrow  
- Safeguarding policy drafting  
- Price changes  

---

## P. Production deployment status

| Item | Status |
|------|--------|
| Commit + push to `origin/main` | **Done** — `5a3c57e` pushed to `origin/main` |
| Prisma / DB | **Not changed** |
| Vercel production | Auto-deploy expected from `main`; confirm Ready alias on www.mytutoringhub.com after push |
| Authenticated dashboard UI | Residual — credentials required for full human click-through |

---

## Confirmations

1. Overall verdict: **WHOLE-SITE CONSISTENCY PASS — COMPLETE**  
2. Prisma/database: **NOT changed**  
3. Locked Teaching Profiles plan: **NOT reopened**  
4. Homepage visual design: **NOT redesigned** (wording only)  
5. Stop condition: safe consistency defects fixed; no Phase-1 schema/onboarding rewrite continued  
