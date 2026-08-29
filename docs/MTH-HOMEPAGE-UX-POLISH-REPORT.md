# MTH Homepage UX Spacing Polish Report

Date: 2026-08-30

> **Follow-up:** conversion & visual polish documented in [`MTH-HOMEPAGE-FINAL-POLISH-REPORT.md`](./MTH-HOMEPAGE-FINAL-POLISH-REPORT.md).

## Confirmed issues

- Global `.section` padding plus local overrides made consecutive homepage blocks uneven and tall.
- Hero near-full viewport min-height left empty vertical waste on tall desktops.
- `.section-lead` margins stacked with section padding → large heading→content gaps.
- Card grids used mixed padding/gaps (product trio, prestige pillars, steps, country markets, free-vs-paid).
- After the final CTA became dual Find + Become, mid-page tutor recruitment needed a dedicated band.
- Mobile (320–430px) inherited roomy desktop section/hero padding.

## Spacing system (scoped `.home-page`)

| Token | Role | Approx range |
|-------|------|----------------|
| `--home-section-y` | Major section padding-block | 40–80px mobile→desktop |
| `--home-section-y-compact` | Stats band | ~28–52px |
| `--home-lead-mb` | Lead → content | ~0.95–1.15rem |
| `--home-card-gap` | Grid gaps | ~0.7–1.1rem |
| `--home-card-pad` | Card padding | ~0.9–1.2rem |

Rules are under `.home-page` only — other pages keep global `.section` / hero styles.

## Hierarchy

- Final CTA: dual **Find a tutor** + **Become a tutor** (prior work).
- Added compact mid-page **Teach students worldwide** recruit (Become a tutor + Tutor plans) between student request and country markets.
- No other section reorder.

## Mobile

- ≤430px: section ~40–52px; hero min-height cleared; tighter hero content; recruit/CTA CTAs stretch cleanly.
- 431–720px: intermediate tightening.
- ≥900px: hero min-height capped (~34rem / viewport − header).

## Sections moved

None. One section **added** (mid-page tutor recruit).

## Files touched

- `src/app/(home)/page.tsx`
- `src/app/globals.css`
- `docs/MTH-HOMEPAGE-UX-POLISH-REPORT.md`

## Tests

See TypeScript check output from this pass.

## Before / after height (CSS estimates)

| Viewport | Before (approx) | After (approx) | Notes |
|----------|-----------------|----------------|-------|
| Desktop hero | ~100svh − header | min(34rem, 100svh − header) | Less empty hero |
| Desktop section | up to ~76px pad | ~56–80px clamp | Consistent stack |
| Mobile section | ~48px+ inherited | ~40–52px | Cleaner phones |
| Page length | — | Hero/section savings ~8–15%; recruit adds ~120–180px | Net still tighter |

## Deliberately unchanged

- Marketplace V2, search logic, URLs, SEO/JSON-LD
- Pricing numbers and entitlements
- Past papers / curriculum behavior
- Global `.section` outside the homepage
- Country/subject SEO routes and market data
