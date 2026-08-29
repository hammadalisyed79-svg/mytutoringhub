# MTH Homepage Final Polish Report

Date: 2026-08-30  
Live: https://www.mytutoringhub.com

## Before issues

- Featured tutors could repeat the same person via multiple Teaching Listings.
- Small marketplace metrics (active tutors / students / open requests) on the homepage.
- Heavy three-card Free vs Paid grid and bordered white-card fatigue (pillars, markets).
- Giant Invite-a-Tutor widget on the public final CTA.
- No dedicated Past Papers conversion section.
- Country markets showed eight dense cards with many chips.
- Trust ribbon mixed payment-method copy (“Bank transfer” / Safepay) with product trust signals.

## Changes (this pass)

1. **Hero** — kept; minor search shell / value-strip contrast priority only (not taller).
2. **Trust ribbon** — Identity verification · Rates in your currency · No commission on lesson fees · Direct tutor contact · 50+ countries & boards.
3. **Featured tutors** — deduped by `tutorProfileId`; strongest ACTIVE listing (sort: highlight → boost → recency); up to 4 unique cards; real photo/name/Identity Verified/subject/context/rate/availability/rating-if-reviews/View profile. No Highlighted paid badge.
4. **Stats** — only curriculum subject codes + past paper count when real.
5. **Free vs paid** — replaced card grid with open summary + Compare plans → `/pricing`.
6. **Why MTH** — two-column icon+text rows (less white-card grid).
7. **How it works** — connected steps + Find a tutor CTA.
8. **Past Papers showcase** — real `pastPaperCount`, abstract filter UI, Browse / Find exam tutor CTAs.
9. **Visual moments** — featured faces, past-papers filter preview, tutor recruit band.
10. **Popular subjects** — high-demand taxonomy chips.
11. **Student request** — compact dual CTA (no Student Pass pricing panel).
12. **Tutor recruit** — free profile, 0% commission, 3 / Pro 10; Become + Tutor plans.
13. **Markets** — compact GB/AE/PK/SA/US/DE; 2–4 cities; ≤4 subjects; explore-all control. SEO routes untouched.
14. **Invite** — removed full `InviteTutorShare` from homepage; tiny invite nudge → `/become-a-tutor`. Full widget remains on tutor/student dashboards and become-a-tutor.
15. **Final CTA** — Ready to start? Find a tutor + Become a tutor.

## Section order

Header → trust ribbon → Hero → Product trio → Featured Tutors → How it works → Popular subjects → Past Papers showcase → (compact real stats) → Student request → Why MTH → Free summary → Teach worldwide → Compact markets → Final CTA → Footer

## Featured dedupe method

`dedupeFeaturedListingsByTutor` in `src/lib/featured-tutors.ts`: walk listings already ordered strongest-first; keep first row per `tutorProfileId`; cap at 4. Unit test: `src/lib/featured-tutors.test.ts`.

## Metrics

Kept: past papers count, curriculum subject codes. Removed from homepage marketing: active tutors, student join counts, open requests.

## Past Papers

Section uses live `prisma.pastPaper.count({ where: publicAvailabilityWhere() })`. Abstract filter preview only (no fake screenshots/brands).

## Country markets

Homepage `CountryMarkets compact` uses `HOMEPAGE_COMPACT_COUNTRY_CODES`. Full 8-card selector unchanged for non-compact callers. Country SEO pages untouched.

## Invite relocation

Homepage: text link only. Full share UI: `dashboard/tutor`, `dashboard/student`, `become-a-tutor`.

## Mobile

Scoped `.home-page` rhythm preserved; past-papers / markets / free-summary stack to one column ≤900/720/430px.

## Tests

- `npx tsc --noEmit`
- `node --import tsx src/lib/featured-tutors.test.ts`
- `node --import tsx src/lib/markets-featured.test.ts`
- Related marketplace / search dedupe tests as applicable

## Live verify checklist

Verified on https://www.mytutoringhub.com after deploy of `45cb6bc` (+ subsequent hero split `31fd260`):

- [x] No duplicate featured tutors (one card per tutorProfileId)
- [x] No giant invite widget on homepage (`Invite a tutor` absent; nudge link present)
- [x] No small marketplace metrics (`Active tutors` absent)
- [x] Simplified plans summary (`Start free. Upgrade` + Compare plans)
- [x] Past Papers section present (`Exam preparation` / past papers count headline)
- [x] Compact markets (`Tutoring markets`)
- [x] Clean final CTA + Direct tutor contact trust ribbon (no Bank transfer)
