# MTH Homepage — FindTutors-inspired professionalism polish

Date: 2026-08-30  
Live: https://www.mytutoringhub.com  
Reference (inspiration only): https://www.findtutors.co.uk

## Inspiration takeaways (layout maturity — not a clone)

From FindTutors desktop/mobile screenshots (cookie modal dismissed where possible via Playwright):

1. **Search-first commercial clarity** — one elevated search surface is the primary action; hierarchy is calm and confident.
2. **Airy section rhythm** — generous but controlled whitespace; clear vertical beats between hero → proof → features → tutors.
3. **Less box stacking** — benefit columns often use open borders/icons instead of heavy card chrome.
4. **Confident typography scale** — large H1, restrained lead, strong primary CTA weight.
5. **Featured people presentation** — tutor faces / profiles feel intentional, not stretched dashboard tiles.
6. **Trust near the decision** — proof sits close to search (aggregate ratings on FT; **we use only real MTH facts**).

## Gaps we addressed on MTH

| Gap vs FT professionalism | MTH change |
|---|---|
| Search felt like two stacked mini-cards | Unified elevated `.hero-search-shell`; inner rows borderless with a light divider |
| Product trio added card fatigue | Open numbered columns (top-rule links) |
| Featured tutor (often 1) stretched full-width / odd avatar crop | Count-aware grid + fixed 4:3 photo frame + contained card width |
| Mid-page stats felt disconnected | Compact **proof strip** under hero with real curriculum/past-paper counts + commercial rules |
| Alternating `section-alt` noise | Cleaner section borders / fewer stacked alt bands |
| Typography slightly soft | Slightly larger H1, tighter tracking, clearer section leads |

## What deliberately was **not** copied

- FindTutors branding, logos, blue palette, or GoStudent lockups
- Exact headlines, review carousel copy, or “millions of ads” claims
- Fake star aggregates, invented tutor counts, or fabricated testimonials
- Full-bleed photo hero / circular overlapping headshot collage
- Marketplace V2, search logic, Safepay, Past Paper SEO URLs, pricing/entitlements

## What stayed (MTH identity)

- Warm ivory + sage/green palette
- Brand line **“Private tutoring, elevated.”**
- Split-hero product composition (real tutor card + past-paper mini + study chip)
- Past Papers as the core differentiator
- Trust ribbon facts (identity verification, currency, commission, contact, countries/boards)

## Files changed

- `src/app/(home)/page.tsx` — proof strip, open product trio, featured photo frame, section rhythm
- `src/app/globals.css` — homepage-scoped visual polish
- `docs/MTH-HOMEPAGE-FINDTUTORS-INSPIRED-POLISH.md` — this report

## Tests

- `npx tsc --noEmit` — **pass**
- `npm run build` — **pass** (Next.js 16.3.1 / Turbopack)

## Live verify checklist

- [x] Desktop hero: split layout retained; search shell reads as one commercial control (pre-push code review + post-deploy Playwright)
- [x] No full-bleed classroom photo
- [x] Proof strip shows only real counts / business rules (no fake reviews)
- [x] Featured tutors: portrait cards, no full-bleed stretch when few listings
- [x] Product trio: open columns, not heavy bordered cards
- [x] Past Papers mid-page still present and linked
- [x] Mobile ≤430: stacked hero, usable search, featured cards readable
- [x] Search still submits subject/country/city/mode to `/search`
