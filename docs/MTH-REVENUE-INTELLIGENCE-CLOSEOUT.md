# MTH — Revenue Intelligence Closeout

**Date:** 2026-09-12  
**Scope:** Measurement + management visibility only. Commercial model **LOCKED**. Prior small-gap UX (`docs/MTH-REVENUE-PROTECTION-IMPLEMENTATION.md`) was **not** redone.

---

## A. Executive verdict

**MTH REVENUE INTELLIGENCE — READY**

Core funnel GA catalog completed (no duplicate purchase on checkout click), purchase attribution normalized, durable limit/quota hits persisted via existing `UsageEvent` (no schema migration), admin funnel dashboard ships on observed Prisma data with **REVENUE PER NEW STUDENT–TUTOR CONNECTION** highlighted. BWY identity not present in product surfaces. Safepay covers platform SKUs only; lessons stay off-platform.

---

## B. Events already present (pre-closeout)

- Registrations, `tutor_search`, teaching profile view, student contact, request created, purchases via receipt, limit/upsell/paper quota/match survey (small-gap), teaching profile activated, tutor profile completed (live flag), listing boost / priority purchases.

## C. Events added / completed this closeout

| Event | How |
|-------|-----|
| `student_search` + `search_results_view` | Search page (kept legacy `tutor_search` for Ads) |
| `contact_tutor_attempt` | Contact + messages compose |
| `student_pass/pro_checkout_started`, `tutor_pro_checkout_started`, `listing_boost_checkout_started`, `priority_verification_checkout_started` | SubscribeButton after successful checkout session |
| `student_request_attempt` | NewAdForm |
| `past_paper_view` | Past paper browse / SEO hubs |
| `past_paper_download` | BuyButton + download API product event |
| `enquiry_reveal` (GA) | Tutor compose success |
| `new_conversation` | Messages API + client |
| `first_tutor_reply` / `first_student_reply` | Thread reply API + MessageThread GA |
| Durable `*_limit_hit` / `paper_quota_exhausted` | `UsageEvent` via `trackProductEvent` (no new table) |

**Not duplicated:** existing limit / upsell / match / purchase success paths.

## D. Purchase / revenue attribution

Receipt beacon params (snake_case):

`product`, `plan`, `billing_period`, `currency`, `actual_paid_value`, `transaction_id`, `payment_source`

Sources: `safepay` | `complimentary` | `manual` | `promo` (and stripe fallback if used).

Rules:

- Purchase only on confirmed ACTIVE/TRIALING receipt
- Checkout click → `*_checkout_started` only
- Complimentary Tutor Pro → `actual_paid_value = 0`
- Cash parsed from `safepay_{CURRENCY}_{minor}` on `Subscription.stripePriceId`

## E. Deduplication

- Purchases: `sessionStorage` key `purchase_{subscription.id}` (= `transaction_id`)
- Past papers: `paper_{key|token}`
- Checkout started: tracker/plan + timestamp (intentional once-per-click)

## F. Admin KPI dashboard

| Route | Purpose |
|-------|---------|
| `/admin/revenue` | Actual MTD cash by product + paid MRR estimate |
| `/admin/revenue/funnel` | Student / tutor / marketplace / papers / key rates |

Prominent metric: **REVENUE PER NEW STUDENT–TUTOR CONNECTION** = MTD platform cash ÷ new student↔tutor conversations.

## G. Current measurable funnel

Regs, search volume, contacts, reveals, conversations, response rate, time-to-first-tutor-reply, match YES rates, Pass/Pro/Boost/Priority activations, paid paper revenue, limit-hit → upgrade (when durable hits exist).

## H. Metrics not yet measurable (and why)

| Metric | Why |
|--------|-----|
| User-attributed search→contact | `SearchAnalyticsEvent` has no `userId` (volume proxy only) |
| Listing view→contact with viewer | Listing views not durable with viewer id |
| Admin past_paper_view count | GA-only by design this closeout |
| Boost “X more visibility / leads” | Parked — no reliable boost-window attribution |

## I. MTH / BWY identity findings

| File | Route | Current text | Purpose | Risk | Recommended action |
|------|-------|--------------|---------|------|--------------------|
| `docs/MTH-REVENUE-PROTECTION-IMPLEMENTATION.md` | — | “BWY legal entity invent/replace” parked | Internal docs | Low | Keep parked; do not invent entity |
| `package-lock.json` | — | hash substring `…TWBWYUzlra…` | False positive | None | Ignore |

**No BWY** in Terms, Privacy, footer, receipts, emails, Safepay letter, or env templates. Product brand = **My Tutoring Hub**.

**MERCHANT IDENTITY BLOCKER:** **NOT FLAGGED** in this repo (dashboard trading name is outside code).

## J. Safepay readiness

Expects Safepay for: Student Pass, Student Pro, Tutor Pro (`TUTOR_BASIC`), Listing Boost, Priority Verification, Past Paper pay-per-download.

Lesson fees: **not** Safepay — arranged privately; 0% commission.

Config: env keys required; live gate = configured + `SAFEPAY_ENV=production`. No credentials invented.

## K. Database / schema changes

**None applied this task.** Limit/quota durability reuses `UsageEvent.type` strings. No `db push`.

## L. Tests / build

Ran successfully:

- `analytics-conversions.test.ts` — ok
- `revenue-intelligence.test.ts` — ok
- `match-survey.test.ts` — ok
- `npm run test:commercial` — ok
- `npx tsc --noEmit` — ok
- `npx next build` — ok

Verified: complimentary value 0; purchase ≠ checkout; PII keys stripped; dashboard uses observed data; no schema push.

## M. Files changed (primary)

- `src/lib/analytics-conversions.ts` (+ tests)
- `src/lib/revenue-intelligence.ts` (+ tests)
- `src/lib/product-events.ts`
- `src/components/SubscribeButton.tsx`, `ContactTutorForm.tsx`, `StartMessageFromQuery.tsx`, `NewAdForm.tsx`, `PastPaperBuyButton.tsx`, `MessageThread.tsx`, `AdminNav.tsx`
- `src/app/search/page.tsx`, past-papers pages, messages APIs, safepay/past-paper checkout, download
- `src/app/admin/revenue/page.tsx`, `src/app/admin/revenue/funnel/page.tsx`
- `src/app/receipt/[id]/page.tsx`
- This report

## N. Deployment status

Committed and pushed with this closeout (see git).

## O. Remaining blockers

1. Confirm Safepay **dashboard** merchant display name is My Tutoring Hub (ops, not code).
2. Optional later: user-scoped search + listing-view durable events for true attribution rates.
3. Keep Boost performance claims parked.

---

### Final verdict

**MTH REVENUE INTELLIGENCE — READY**
