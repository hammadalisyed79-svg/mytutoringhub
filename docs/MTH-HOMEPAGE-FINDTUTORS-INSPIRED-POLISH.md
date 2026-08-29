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

- `src/app/(home)/page.tsx` — proof strip, open product trio, featured photo frame, section rhythm; later: full-width search under split top
- `src/components/HeroSearch.tsx` — single elevated bar (subject → format → country → city → Search); button last
- `src/components/HomeLoading.tsx` — matches new hero geometry
- `src/app/globals.css` — homepage alignment system + header container align to `--container`
- `docs/MTH-HOMEPAGE-FINDTUTORS-INSPIRED-POLISH.md` — this report

## Tests

- `npx tsc --noEmit` — **pass**
- `npm run build` — **pass** (Next.js 16.3.1 / Turbopack)

## Clean hero + no Featured Tutors (2026-08-30)

**Why Zain Ali / Past Papers floated in the hero:** they were added in an earlier “split-hero product composition” pass to show marketplace + Past Papers in the first viewport — user rejected that as unprofessional vs FindTutors.

**Removed**
- Entire homepage **Featured tutors** section (tutors only via `/search`)
- Homepage featured-tutor Prisma query
- Hero floating tutor card, Past Papers mini-card, and Study support chip

**Changed**
- Search-first clean hero: brand + H1 + lead + full-width search bar only
- Tighter section padding (~40–60px)
- Proof strip clustered (not ultra-wide sparse)
- Student-request CTAs grouped compactly
- Sticky header overlap: `scroll-padding-top` + section `scroll-margin-top` + more opaque header
- Continue rail gap tightened under hero

Past Papers mid-page section kept as MTH differentiator.


User feedback: prior polish still felt unprofessional / unaligned vs FindTutors. DOM audit at 1440 / 1024 / 768 / 390 found:

| Bug | Evidence | Fix |
|---|---|---|
| Hero left edge ≠ section containers on mobile | hero `left:20` vs `.container` `left:10` at 390 | Hero/continue rail use `.container` + matching responsive gutters |
| Header measure wider than content | header used `1320px` vs `--container` `1180px` | Removed header container override; shares `.container` |
| Search CTA between fields | Button sat above country/city | Unified bar; fields then **Search tutors** last |
| Tall dual-card search | Stacked row + place card | One elevated pill/rounded bar; guided link outside elevation |
| Skewed product compose | Paper/chip `margin-left` stagger | Flush left margins on compose items |
| Featured lonely stretch / uneven frames | Single card full-bleed crop | Horizontal 1-card layout; circular aligned photo frames |
| Proof strip uneven wrap | Flex wrap left-ragged on mobile | CSS grid 4→2→1 with centered/start alignment |
| Uneven trio/step columns | Heights 138 vs 111 at 1024 | Equal `1fr` tracks + stretch |

### Structure after alignment pass

1. Soft full-width hero band  
2. `.hero-split-top` — copy ‖ product compose (circular avatar)  
3. Full-width search bar spanning the same container  
4. Foot microcopy row  
5. Proof strip / open trio / featured / rest  

### Live re-verify

Re-check after this commit on https://www.mytutoringhub.com at 1440 / 1024 / 768 / 390: shared left edges, pill/bar search, no overflow, featured card aligned.

### Checklist

- [x] Desktop hero: split top + full-width search bar aligned to site container
- [x] No full-bleed classroom photo
- [x] Proof strip shows only real counts / business rules (no fake reviews)
- [x] Featured tutors: equal-height / aligned photo frames
- [x] Product trio: open equal columns
- [x] Past Papers mid-page still present and linked
- [x] Mobile ≤430: shared gutters, stacked search, no horizontal overflow
- [x] Search still submits subject/country/city/mode to `/search`

