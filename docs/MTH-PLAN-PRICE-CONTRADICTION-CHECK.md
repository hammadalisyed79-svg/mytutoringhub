# Plan / price contradiction check

**Date:** 2026-08-31  
**Repo:** `C:\Tutor`  
**Scope:** Locked Teaching Profiles / Marketplace V2 commercial model vs code + public copy  
**SoT:** [`MTH-TEACHING-PROFILES-PLAN.md`](./MTH-TEACHING-PROFILES-PLAN.md) §A.6, [`MTH-MARKETPLACE-V2-TRACKER.md`](./MTH-MARKETPLACE-V2-TRACKER.md)  
**Prior pass:** [`MTH-WHOLE-SITE-CONSISTENCY-AUDIT.md`](./MTH-WHOLE-SITE-CONSISTENCY-AUDIT.md)

**Verdict: CONTRADICTIONS FIXED** (minor stale copy / billing-period drift; commercial numbers already matched SoT)

Plan was **not** reopened. No prices invented. No Free-cap cliff added.

---

## Contradiction matrix

| Item | Plan says | Code/UI said | Severity | Action |
|------|-----------|--------------|----------|--------|
| Tutor Free ACTIVE Teaching Profiles | **3** permanently | `FREE_SUBJECT_PROFILES` / `BUSINESS` = 3; public pages match | — | Aligned |
| Tutor Pro ACTIVE Teaching Profiles | **10** | `TUTOR_PRO_SUBJECT_PROFILE_CAP` = 10; public match | — | Aligned |
| Listing-cap promo / Oct cliff | Retired; no 2→0 or 3→1 | `isSubjectProfilePromoActive() === false`; no public cliffs | — | Aligned |
| Tutor Pro price promo | Complimentary to **30 Sep 2026** (separate from Free cap) | `promoUntil: "2026-09-30"`; copy separates Free cap | — | Aligned |
| Listing Boost | PKR **999**, one-time, **30 days**, one profile, **no capacity** | `AD_BOOST` 999 + features; Pricing uses `once` / add-on footnote | — | Aligned (prior fix) |
| Priority Verification Review | PKR **2,999**, queue only, never auto-verify | `VERIFIED_TUTOR` 2999 + features; Help / Identity copy | — | Aligned |
| Student Free contacts | **3** new unique tutors / month | `STUDENT_FREE_CONTACT_LIMIT` / `BUSINESS` = 3 | — | Aligned |
| Student Pass / Pro | 1999 / 3499; PP 10/mo vs unlimited | `plans.ts` + `STUDENT_PASS_PAPER_DOWNLOADS` = 10 | — | Aligned |
| Past paper pay-per-download | Separate from plan entitlements | Default fee PKR **100** (SiteSettings overrideable); browse free | Low | Flagged — no conflict with Pass/Pro download caps |
| No +1 Teaching Profile SKU | Not a public product | `PUBLIC_ADDON_PLAN_IDS` = Priority Review + Boost only | — | Aligned |
| Extra / Unlimited Profiles | Legacy grandfather only | Hidden from Pricing; labeled legacy | — | Aligned |
| Tutor Basic naming | Public name **Tutor Pro** | `TUTOR_BASIC` id; override remap; no public "Tutor Basic" | — | Aligned |
| Boost shown as `/mo` | One-time 30-day | Pricing / ProfileBoostPanel use `"once"` (prior pass) | — | Aligned |
| Auto-renew vs Safepay | One-shot `payment` | Terms + SubscribeButton hedge; no assumed renew | — | Aligned |
| Admin promo-note placeholder | Pro **price** promo ≠ listing cap | Placeholder said “Complimentary **listing** until 30 September” | Medium | **Fixed** — Pro price promo + Free 3 permanent |
| SubscribeButton complimentary loading | Tutor Pro offer activation | “Activating complimentary **listing**…” | Low | **Fixed** — “complimentary offer” |
| Dashboard upgrade hints | Free 3 / Pro 10 from SoT | Hardcoded `3` / `10` in `plan-limits.ts` | Low | **Fixed** — wired to entitlement constants |
| Help / Terms caps | Free 3 / Pro 10 / contacts 3 | Hardcoded literals (correct values) | Low | **Fixed** — consume `BUSINESS` |
| How-it-works Boost line | One-time 30-day, no capacity | “Optional Listing Boost … paid on Safepay” only | Low | **Fixed** — one-time / no capacity |
| Safepay add-on `billingPeriod` | One-time purchase | Stored as `"monthly"`; orderId `mth_*`; inflated admin MRR | Medium | **Fixed** — store `"once"`; exclude from MRR |
| API `freeCapAfterPromo` field name | Cap not promo-tied | Name implies cliff; **value** = 3 permanent | Low | **Flagged** — rename later; value correct |
| Stale commercial audit doc | Free 3 permanent | `MTH-MARKETPLACE-V2-COMMERCIAL-AUDIT.md` still describes 2→0 | Doc only | **Flagged** — already superseded by plan/tracker; do not treat as law |

---

## Files touched this pass

- `src/components/AdminActions.tsx`
- `src/components/SubscribeButton.tsx`
- `src/lib/plan-limits.ts`
- `src/app/help/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/how-it-works/page.tsx`
- `src/app/api/safepay/checkout/route.ts`
- `src/lib/safepay-complete.ts`
- `src/app/admin/revenue/page.tsx`
- `src/app/admin/subscriptions/page.tsx`
- `prisma/schema.prisma` (comment only: `billingPeriod` may be `"once"`)
- `docs/MTH-PLAN-PRICE-CONTRADICTION-CHECK.md` (this file)
- `docs/MTH-WHOLE-SITE-CONSISTENCY-AUDIT.md` (append)

**Not changed:** Teaching Profiles plan, prices, Prisma models/migrations, public product SKUs.

---

## Verification

Run: `npx tsx src/lib/public-commercial-consistency.test.ts`, entitlement / subscription commercial tests, `npx tsc --noEmit`.
