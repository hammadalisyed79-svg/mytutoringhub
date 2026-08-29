# MTH Homepage Hero — Final Production Polish Report

Date: 2026-08-30  
Live: https://www.mytutoringhub.com

## Old problems

- Full-bleed classroom photograph as hero LCP background (CSS `url(...)` + `HeroImagePreload`).
- Near–full-viewport min-height (`100svh`) left empty vertical space and fought content hierarchy.
- Hero stacked marketing noise: Recently viewed, For students / For tutors path cards, Join/List links, long commercial paragraphs / value strip.
- White-on-photo typography and glass search shell required dark-on-light overrides for chips and muted links.
- No real product composition in the first viewport — marketplace felt like a photo landing page.

## New structure

1. **Trust ribbon** — unchanged in root layout (above hero). Not duplicated inside the hero.
2. **Hero (`.hero.hero-split`)** — content-driven height; desktop ~48/52 two-column split; warm ivory + soft sage tint; dark green / warm logo accents only.
   - **Left:** LogoMark + eyebrow `WORLD-CLASS TUTORING MARKETPLACE` (styled uppercase), H1 `Private tutoring, elevated.`, tighter lead copy, preserved `HeroSearch` (same params/behavior), microcopy (`3 tutor contacts/month free · No commission on lesson fees`), subtle Become a tutor link.
   - **Right:** Real tutor card (or generic discovery fallback) + past-paper mini-card (real taxonomy) + optional study-support chip.
3. **Continue where you left off** — `RecentAndSavedTutors` moved immediately below hero; renders only when local recent/saved data exists (no empty placeholder).
4. Mid-page sections (Featured Tutors, How it Works, Popular Subjects, Past Papers showcase, Student Request, Why MTH, tutor recruit, Countries, Footer) — left as-is for this pass.

## Tutor selection logic

- Source: same public-eligible active `subjectProfile` query used for featured listings (highlight → boost → recency).
- `pickHeroShowcaseTutor()` (stable, not random): first listing with HTTP photo, display name, subject, and positive rate.
- Card shows: photo, name, Identity Verified only when `verified`, subject, real board/qual/level context line, rate, online/location, View profile.
- No invented ratings, lesson counts, reviews, or experience in the hero card.
- Fallback: generic “Browse real teaching listings” discovery card linking to `/search` when no complete tutor exists.

## Past paper visual source

- `prisma.pastPaper.findFirst` with `publicAvailabilityWhere()`, ordered by year desc then `updatedAt` desc.
- Taxonomy chips from real fields: board, qualification, subject, year, document/paper type label via `documentTypeLabel`.
- Decorative paper sheet is CSS-only (`aria-hidden`); link targets `/past-papers` with matching filter query params when present.
- No fake exam-board brands.

## Responsive

| Viewport | Behavior |
|----------|----------|
| ≥900px | Two-column split; content max ~700px; soft overlap on paper card |
| 431–720px | Single column; tighter padding |
| ≤430px | Single column; tutor card stacks; paper card margin cleared |

Checked for overflow intent at 1440 / 1024 / 768 / 430 / 390 (CSS grid + `minmax(0, …)` + wrap).

## Accessibility

- Unique page H1 with `id="home-hero-title"`; section `aria-labelledby`.
- Search labels preserved via `HeroSearch` / `SuggestField` / select `aria-label`s.
- Contrast: ink / muted on ivory–sage (not white-on-photo).
- Decorative paper preview `aria-hidden`; LogoMark decorative.
- Focus styles on search controls unchanged (brand outline).
- Continue rail uses an `h2` only when content exists.

## Performance

- Removed homepage `HeroImagePreload` and photographic CSS background role for the split hero (asset constants retained in `hero-media.ts` if reused elsewhere).
- No new animation libraries, video, or canvas.
- Hero tutor avatar may use `priority` only when a real photo is shown.
- Streaming fallback (`HomeLoading`) matches `.hero-split` geometry without the photo LCP.

## Tests

- `npx tsc --noEmit` — pass
- `npx tsx src/lib/featured-tutors.test.ts` — pass (includes `pickHeroShowcaseTutor`)
- `npx tsx src/lib/search-smart.test.ts` — pass (hero search param helpers)

## Live verify (post-deploy)

Confirm on https://www.mytutoringhub.com:

- [ ] No full-background classroom photo in the hero
- [ ] Balanced two-column split on desktop; stacked on mobile
- [ ] Search is obvious and submits with subject/country/city/mode params
- [ ] Right column shows a real tutor (or honest fallback) — no fake ratings/reviews
- [ ] Past-paper mini-card uses real taxonomy when catalogue has papers
- [ ] Recently viewed appears only below hero when data exists
- [ ] No horizontal overflow at 1440 / 1024 / 768 / 430 / 390

## Files touched (this pass)

- `src/app/(home)/page.tsx`
- `src/app/globals.css`
- `src/components/HomeLoading.tsx`
- `src/components/RecentAndSavedTutors.tsx`
- `src/lib/featured-tutors.ts`
- `src/lib/featured-tutors.test.ts`
- `docs/MTH-HOMEPAGE-HERO-FINAL-REPORT.md`

## Deliberately unchanged

- SEO metadata / JSON-LD / sitemap / robots
- Header structure; TrustRibbon placement
- HeroSearch query behavior
- Mid-page marketplace sections (except continue-rail placement under hero)
- Unrelated dirty WIP files (markets / CountryMarkets / PrestigePillars / TrustRibbon polish)

---

**MTH HOMEPAGE HERO — FINAL PRODUCTION POLISH COMPLETE**
