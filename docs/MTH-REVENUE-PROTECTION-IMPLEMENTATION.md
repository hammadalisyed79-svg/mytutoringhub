# MTH — Revenue protection implementation (small gap list)

**Date:** 2026-09-12  
**Scope:** Four gaps only. Commercial model **LOCKED** — no price/cap changes, no lesson commission, no Teaching Profiles schema migration.

## Verdict

**DONE** for the approved small gap list.

## What shipped

### 1. Past paper “X of 10 left” + exhausted Pro CTA

- `PastPaperQuotaBanner` on `/past-papers` and SEO paper hubs.
- Uses existing `canDownloadPastPaper` (Pass = 10/month, Pro = unlimited).
- `PastPaperBuyButton` on `paper_limit_exceeded` shows message + **View Student Pro** (`/pricing?plan=STUDENT_PRO`) and fires GA events.

### 2. Limit-hit / upsell GA events

New conversion names in `analytics-conversions.ts`:

- `student_contact_limit_reached` / `student_pass_upsell_view`
- `enquiry_reveal_limit_reached` / `tutor_pro_upsell_view`
- `past_paper_quota_exhausted` / `student_pro_upsell_view`
- `successful_match_student_response` / `successful_match_tutor_response`

Fired from contact compose, tutor reveal compose, and paper quota exhaustion. Product event `enquiry_reveal_limit_hit` added alongside existing `tutor_contact_limit_hit`.

### 3. Tutor reveal-limit CTA wording

- Messages compose no longer treats all non-students as unlimited.
- Tutors get reveal remaining meter + **Activate Tutor Pro** (`/pricing?plan=TUTOR_BASIC`).
- Messages API `upgradeUrl` fixed: Student Pass / Tutor Pro (not bare `/pricing`).

### 4. Optional match-proxy survey

- Model `MarketplaceMatchFeedback` (YES / NO / SKIP; one per user per conversation).
- Shown in thread after ≥4 messages with ≥2 senders; dismissible; no PII.
- API: `GET|POST /api/messages/[id]/match-feedback`.

## Explicitly not done (parked)

- Admin mega funnel KPI dashboard
- Fabricated Boost attribution metrics
- Free-limit changes / lesson escrow / commission
- BWY legal entity invent/replace

## Verify

```bash
npx tsx src/lib/match-survey.test.ts
npx tsx src/lib/analytics-conversions.test.ts
npx tsc --noEmit
npx prisma db push
```
