# Marketplace V2 — Final Implementation Report

**Date:** 2026-08-29  
**Repo:** mytutoringhub (`C:\Tutor`)  
**Branch:** `main`  
**Live site checked:** https://www.mytutoringhub.com  

## Verdict

**Marketplace V2 implementation is COMPLETE in code** against the approved commercial decisions (Free **3** / Pro **10**, listing-rate listability, SKU collapse, verification earned, durable search analytics, public-copy SoT).  

**Production is not yet verified as fully reflecting this code.** Curl of the live site (pre-deploy) still shows legacy “2 free / 1 October” become-a-tutor copy and public Extra Profile Ads. Treat live cutover as **pending deploy + human spot-check**.

---

## COMPLETED

### Entitlements (canonical)
- Tutor Free: **3** ACTIVE teaching listings (`FREE_SUBJECT_PROFILES`)
- Tutor Pro (`TUTOR_BASIC`): **10** ACTIVE listings (`TUTOR_PRO_SUBJECT_PROFILE_CAP`)
- Promo “2 free until 30 Sep 2026 → 0” **retired** from listing-cap model
- Legacy `EXTRA_PROFILE_ADS` → Pro-equivalent cap (10); `UNLIMITED_ADS` → ∞ (grandfather)
- Student Free contacts remain **3**; Pass/Pro prices unchanged

### Verification & ranking
- `VERIFIED_TUTOR` = Priority Verification Review only (queue)
- Badge / plan tier 2 only from earned `verified` flag — purchase alone does not verify or buy Elite tier
- Listing Boost preferred; Highlight kept as legacy alias

### Rates / listability
- Teaching Listing `rate` authoritative
- Profile `hourlyRate` not required for listability when ≥1 ACTIVE listing has rate ≥ 500
- Master profile “From …” lowest active listing rate retained where already implemented

### Public commercial surfaces
- SoT: `plan-limits.ts`, `subject-profile-entitlements.ts`, `subscription.ts`, `marketing-copy` / `business-rules` / `free-vs-paid`
- Pricing hides Extra/Unlimited from public add-ons (`PUBLIC_ADDON_PLAN_IDS`)
- Pages/emails/dashboard strings updated away from 2→0 promo model (repo)

### Payments / legal copy
- Safepay = platform products + eligible past papers; no lesson escrow claims
- Refund: no false “auto-renew always on” claim
- Privacy: no Stripe-field implementation detail; legal-review backlog + safeguarding note documented (policy not claimed to exist)

### Analytics
- `SearchAnalyticsEvent` model + `trackProductEvent` persistence for search shown / zero-results (+ listing ids)
- Existing `ProfileView` retained for profile views

### Tests run (local)
- `npx tsc --noEmit` — pass
- `subject-profile-entitlements.test.ts` — ok (3 / 10)
- `subscription-entitlements.test.ts` — ok (Priority Review ≠ tier 2)
- `tutor-profile-completion.test.ts` — ok
- `npx prisma generate` — ok after `SearchAnalyticsEvent` added

---

## Production verification (2026-08-29)

| Check | Result |
|-------|--------|
| Live homepage HTTP | 200 |
| Live `/pricing` mentions Tutor Pro | Yes |
| Live `/pricing` still sells Extra Profile / Unlimited | **Yes (stale vs V2 code)** |
| Live `/pricing` “up to 10” | **0 matches (not deployed yet)** |
| Live become-a-tutor “2 free” / “1 October” | **Still present (stale)** |
| DB entitlement behaviour Free 3 / Pro 10 | **Needs post-deploy human check** |
| Priority Review does not auto-verify | Code-verified; live admin path needs human check |
| Free tutors in search / relevance / dedupe | Code-verified earlier; live regression needs human checklist |

---

## INTENTIONALLY DEFERRED

- Lesson payments, escrow, wallets, payouts, booking
- Qualification / degree verification (beyond identity)
- Child Safety & Safeguarding Policy drafting (documented backlog only)
- Future price changes
- Substantive refund economics redesign
- Full live regression checklist after deploy (human)

---

## MARKETPLACE V2 IMPLEMENTATION COMPLETE

**Declared for repository / approved-decision implementation.**  
**Not declared for production parity** until deploy lands and the human checklist in the tracker is signed off against https://www.mytutoringhub.com.
