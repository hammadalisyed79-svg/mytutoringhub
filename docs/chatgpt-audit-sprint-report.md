# My Tutoring Hub — Production Audit Sprint Report

**For:** ChatGPT re-review  
**Site:** mytutoringhub.com  
**Repo commit:** `2c95a4e` (pushed to `origin/main`)  
**Date:** 23 August 2026  
**Scope:** Response to the “complete site-wide audit and correction sprint” brief

This document lists **what was implemented**, **what was deliberately not changed**, and **what remains open**, mapped to the original brief sections (§1–§37).

---

## Vision alignment note (agent → ChatGPT)

The brief largely matched the product’s intended model. One important correction to the brief’s framing:

- **Tutor Basic is NOT required to appear in search.**  
  Complete + email-verified tutor profiles list **free**. Tutor Basic adds priority, unlimited enquiry reveals, and subject ads.

Everything else in the brief (3 free student contacts, Pass = unlimited, no lesson commission, no fake verification claims, past-paper CTA accuracy) was treated as the source of truth and implemented accordingly.

---

## BUSINESS RULES (final, as implemented)

### Student Free
- Create account free  
- Browse tutors free  
- View profiles free  
- **3 new tutor contacts per month** (`STUDENT_FREE_CONTACT_LIMIT` in `src/lib/plan-limits.ts`)  
- Lesson fees arranged directly with tutor  
- **No lesson commission**

### Student Pass
- Unlimited tutor contacts  
- Student request ads  
- **10 past-paper downloads/month** (`STUDENT_PASS_PAPER_DOWNLOADS`)  
- Existing Pass features preserved

### Student Pro
- Everything in Pass  
- Unlimited past-paper downloads  
- AI Study Assistant  
- Existing Pro tools preserved

### Tutor Free
- Register free  
- Build profile  
- **Appear in search free** when profile is complete **and** email is verified **and** display name is not suspicious  
- Receive/reply to student messages per existing rules  
- Free tutors get limited enquiry reveals when messaging students first (`TUTOR_FREE_REVEAL_LIMIT = 5`)

### Tutor Basic / paid tutor
- Priority ranking  
- Unlimited enquiry reveals  
- Subject ads (up to 3; Unlimited Ads add-on exists)  
- Complimentary promo until **30 September 2026** (existing plan config)  
- Add-ons remain: Verified Tutor, Highlighted Listing, Profile Boost, Unlimited Ads

### Platform commission
- **No commission on lesson fees** — consistent sitewide wording

---

## FIXED (significant changes)

### Phase A — Business consistency
| Item | Change |
|------|--------|
| Canonical config | Added `src/lib/business-rules.ts` consuming `plan-limits` constants |
| Marketing copy | Rewrote `src/lib/marketing-copy.ts` so VP / contact lines match free-3 + Pass unlimited |
| Contradictory CTAs | Removed “search free, message with Student Pass” style wording |
| Past-paper CTA | `PastPaperTutorCta` now uses `findTutorCtaCopy()` |
| Subject SEO pages | `/s/[subject]/[[...city]]` meta + body copy fixed |
| SEO JSON-LD | `subjectLandingJsonLd` contact wording fixed |
| Search meta | No longer implies Pass is required to message |
| Ads board | No longer says only Tutor Basic can reply |
| Ads new form copy | Tutors reply within enquiry limits; Pass required to **post** |
| Terms §3 | Updated factual product description (Free contacts, free listing, Pass/Pro/Basic) |
| Plans feature text | “Browse verified tutors” → “Browse tutors worldwide” |
| Layout OG/Twitter | Uses shared `VALUE_PROPOSITION` / `VALUE_PROPOSITION_SHORT` |

### Phase B — Trust
| Item | Change |
|------|--------|
| Trust ribbon | “Verified tutor profiles” → **“Identity verification available”** |
| Footer trust badges | Same accurate wording + “No commission on lessons” |
| Display names | `isSuspiciousDisplayName()` + validation on parse (allows non-Latin scripts) |
| Listing eligibility | `syncTutorBadges`: `active = forceActive \|\| (emailVerified && listable)` |
| Paid bypass removed | Paid plans **no longer** set `active` without a complete profile |
| Search filter | Public search requires `emailVerified: { not: null }` |
| Testimonials | Left as **real DB reviews only** (`status: PUBLISHED`); no fake reviews added |

### Phase C — UX
| Item | Change |
|------|--------|
| Rate format | Removed duplicate “/ hour” next to `formatHourly()` (already ends in `/hr`) |
| Availability | `formatTutorAvailability()` prevents “Online · Online” |
| Search empty state | Removed “Listings appear after Tutor Basic”; added online / request / clear CTAs |
| Few-results note | Shown when 1–2 tutors match |
| Homepage | Product trio: Find tutors · Past papers · Study support |
| Homepage tutor CTA | Clarified free listing + Basic as growth tools |
| Pricing hierarchy | **Start free** (Student Free / Tutor Free) → Core plans → **Optional tutor boosts** |
| Student ad budget | Removed double `/hr` |

### Phase D — Past papers / SEO
| Item | Change |
|------|--------|
| CTA component | Shared accurate contact rule + Study assistant link |
| Paper filter | Placeholder `42` → `e.g. 42` (value still from query param when set) |
| Title / H1 | Pattern closer to “{Subject} {code} {Level} Past Papers” |
| Meta description | Mentions download + find tutors |
| Internal links | Subjects · Past papers · Find tutors crumb row |
| SSR | Individual past-paper subject pages remain server-rendered with paper content |

### Phase E — Quality
| Item | Change |
|------|--------|
| Tests | `src/lib/business-rules.test.ts` (name spam + CTA wording) |
| Typecheck | Pass |
| Build | Pass |
| Lint | Pre-existing failures remain (see Remaining) |

---

## NOT CHANGED (deliberately)

| Brief item | Why not changed |
|------------|-----------------|
| Full visual redesign | Explicitly forbidden; identity preserved |
| New paid plans / renamed DB products | Forbidden; used existing plan IDs/names |
| Database schema / migrations | Not required for this sprint |
| Destructive user/tutor deletion | Forbidden; hide via `active` / admin `forceActive` |
| Fake testimonials inventing | Forbidden; only real reviews shown |
| Fabricating tutors or stats | Forbidden |
| Full mobile audit at 320/375/390/430/768 | Partial only; no dedicated device lab pass this sprint |
| Exhaustive a11y rewrite | Practical fixes only where touched |
| Exhaustive broken-link crawl of every route | Not programmatically completed for all public URLs |
| Performance architecture rewrite | Avoided risky rewrites |
| Client-only loading shells on every page | SEO-critical past-paper/subject content kept SSR; interactive pages still use loading UX where already present |
| Bulk one-shot DB update of all incomplete `active` tutors | Visibility corrects on next `syncTutorBadges` (profile save / subscription sync); no mass mutation |
| Privacy policy deep rewrite | Only Terms §3 factual product alignment; privacy left largely intact |
| Hub Points removal | Kept secondary as requested |
| Header primary nav restructure | Already matched recommended priorities for guests (Find tutors, Become a tutor, Past papers, Plans & pricing) |
| “50+ countries & boards” claim | Retained — markets dataset has 50 featured countries |
| Authorization / entitlement backend redesign | Messaging/download limits already enforced server-side; UI aligned to that |
| New admin moderation platform | Used existing `active` / `forceActive` / suspicious-name hide path |

---

## MAP TO BRIEF SECTIONS (§1–§37)

| § | Topic | Status |
|---|--------|--------|
| 1 | Canonical business model | **Done** — documented + coded in limits/copy |
| 2 | Remove contradictions | **Mostly done** — major public surfaces fixed; some email nurture strings may still vary slightly |
| 3 | Central plan/config | **Done** — `business-rules.ts` + existing `plan-limits.ts` / `plans.ts` |
| 4 | Tutor profile quality | **Done** — listable completeness + email + name |
| 5 | Spam display names | **Done** — validation + listing gate |
| 6 | Verification language | **Done** — trust ribbon/footer; per-tutor badge still OK |
| 7 | Search card presentation | **Done** — rate + Online duplication |
| 8 | Empty / low-data states | **Done** on search |
| 9 | Homepage positioning | **Done** — product trio section |
| 10 | No lesson commission | **Done** — consistent wording helpers |
| 11 | Testimonials | **Verified OK** — DB-only; no fake content to remove |
| 12 | Past papers structure | **Partially improved** — H1/meta/links/CTA; year→session grouping already existed |
| 13 | Past-paper CTA rule | **Done** |
| 14 | Paper/component filter | **Done** — placeholder clarified |
| 15 | Loading / SSR | **Partial** — critical past-paper pages SSR; not a full purge of all loading shells |
| 16 | Past-paper SEO metadata | **Improved** |
| 17 | Internal linking | **Improved** on past-paper subject pages |
| 18 | Pricing simplification | **Done** — free → core → optional boosts |
| 19 | Pricing consistency | **Improved** — free tiers + live plans; some dashboard panels still have local copy |
| 20 | Hub Points secondary | **Unchanged** (already secondary) |
| 21 | Header | **Mostly already OK**; no major nav rewrite |
| 22 | Trust bar | **Done** |
| 23 | Footer | **Trust wording fixed**; structure largely kept |
| 24 | Terms / Privacy | **Terms §3 updated**; Privacy not rewritten |
| 25 | Mobile audit | **Not fully executed** |
| 26 | Accessibility | **Not a dedicated pass** |
| 27 | Broken links | **Not a full programmatic audit** |
| 28 | Text quality | **Major contradictions fixed**; not every string on site re-edited |
| 29 | Error/empty/loading | **Search empty improved**; not every page |
| 30 | Performance | **No dedicated pass** |
| 31 | Authorization | **Not weakened**; listing gate tightened |
| 32 | Admin moderation | **Minimal** — hide via completeness/name/email; no new moderation UI |
| 33 | Database safety | **Confirmed** — no destructive ops |
| 34 | Testing | **tsc + build + focused unit tests**; lint has pre-existing errors |
| 35 | TODO/FIXME/demo sweep | **Partial** — known production contradictions cleared; not every TODO removed |
| 36 | Implementation order | Followed A→E |
| 37 | Acceptance criteria | See checklist below |

---

## ACCEPTANCE CRITERIA CHECKLIST (§37)

1. Free student = **3 contacts/month** everywhere major → **Yes** (shared helpers + key pages)  
2. Student Pass = unlimited, not only way to contact → **Yes**  
3. Complete tutor can appear free → **Yes** (and enforced more strictly)  
4. No global “all tutors verified” claim → **Yes**  
5. No duplicate rate/availability on cards → **Yes** (search + related surfaces touched)  
6. Suspicious/incomplete profiles less damaging → **Yes** (listing rules)  
7. Past-paper CTAs accurate → **Yes**  
8. Past-paper crawlable content retained → **Yes**  
9. SEO pages not only “Loading…” shells → **Yes** for past-paper subject routes  
10. Pricing from central config where practical → **Yes** / improved  
11. No fake testimonials → **Yes**  
12. No major nav link broken → **Assumed OK**; no full crawl  
13. Mobile no horizontal overflow → **Not fully re-verified**  
14. Typecheck/build pass; lint has pre-existing issues → **Documented**  
15. Auth/subscriptions/data intact → **Yes**

---

## IMPORTANT FILES CHANGED

### New
- `src/lib/business-rules.ts`
- `src/lib/business-rules.test.ts`

### Core logic / copy
- `src/lib/marketing-copy.ts`
- `src/lib/plan-limits.ts` *(unchanged limits; consumed)*
- `src/lib/plans.ts`
- `src/lib/subscription.ts` *(listing eligibility)*
- `src/lib/display-name.ts`
- `src/lib/search-tutors.ts`
- `src/lib/tutor-catalog.ts` *(availability formatting)*
- `src/lib/seo.ts`
- `src/lib/free-vs-paid.ts`

### UI / routes
- `src/components/PastPaperTutorCta.tsx`
- `src/components/TrustRibbon.tsx`
- `src/components/PricingPlansClient.tsx`
- `src/components/SiteFooter.tsx`
- `src/components/StudentAdCard.tsx`
- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/search/page.tsx`
- `src/app/ads/page.tsx`
- `src/app/ads/new/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/past-papers/page.tsx`
- `src/app/past-papers/[board]/[qualification]/[subject]/page.tsx`
- `src/app/s/[subject]/[[...city]]/page.tsx`
- `src/app/tutors/[id]/page.tsx`
- `src/app/globals.css` *(product trio styles)*

### Not committed
- `tmp_instructions_rest.txt` (local scratch; excluded intentionally)

---

## DATA SAFETY

- **No Prisma migrations**
- **No schema changes**
- **No user/subscription/payment/past-paper record deletion**
- Listing visibility uses existing fields: `TutorProfile.active`, `forceActive`, `User.emailVerified`, profile completeness checks

---

## TEST RESULTS

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |
| `npx tsx src/lib/business-rules.test.ts` | Pass |
| `npx tsx src/lib/visitor-region.test.ts` | Pass |
| `npm run lint` | **Fails** with pre-existing issues (e.g. SiteNav setState-in-effect, tutor-badges prefer-const, other unused-var warnings). Not introduced as build blockers. |

---

## REMAINING ISSUES / SUGGESTED NEXT PASS FOR CHATGPT

Please review and advise priority on:

1. **Email nurture / transactional copy** (`src/lib/email.ts`, `email-nurture.ts`, `email-sequences.ts`) — may still contain older phrasing in places not fully swept.  
2. **Dashboard / help / become-a-tutor microcopy** — mostly aligned already; worth a second contradiction grep.  
3. **One-time admin/job** to re-run `syncTutorBadges` for all tutors so incomplete paid profiles already marked `active` drop out of search without waiting for a save.  
4. **Dedicated mobile + a11y audit** (§25–§26).  
5. **Programmatic public route link crawl** (§27).  
6. **Lint debt cleanup** unrelated to this sprint.  
7. Confirm whether **languages / teaching level** should become hard required fields for listing (currently levels optional; qualifications/country/city/rate/photo/bio/headline/subjects/lesson type/name required).  
8. Confirm paper-filter UX: placeholder is now `e.g. 42` — should blank filters omit `paper` query entirely in all cases (already does when empty).

---

## HOW TO VERIFY MANUALLY

1. `/` — product trio + trust ribbon wording  
2. `/search` — rate shows once (`…/hr`), no Online·Online; empty state CTAs  
3. `/past-papers/cambridge/o-level/business-7115` (or similar) — CTA mentions 3 free contacts; papers still listed; filter placeholder  
4. `/pricing` — Start free → Core → Optional tutor boosts  
5. `/terms` — §3 matches free contacts + free listing  
6. `/ads` — does not claim only Tutor Basic can reply  
7. Sign-in as incomplete tutor — should not appear in public search after profile sync  

---

## SUMMARY FOR CHATGPT

We implemented a **production consistency sprint**, not a redesign. Business rules now have a single helper layer; major public contradictions about Student Free contacts, Student Pass, Tutor free listing, verification trust language, and past-paper CTAs were corrected. Tutor public visibility was tightened (complete profile + verified email + non-spam name). Pricing hierarchy and homepage positioning were clarified. No schema/data destruction. Build and typecheck pass. Full mobile/a11y/link-crawl and some secondary copy surfaces remain for a follow-up pass.

**Ask for ChatGPT:**  
Re-audit the live product against this report. Flag any remaining contradictions you can find in code or copy that we marked as “partial / not changed,” and propose the smallest safe patch list for the next sprint only.
