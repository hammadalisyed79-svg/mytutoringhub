# Teaching Profiles Phase 10 — production verification

**Generated:** 2026-08-30T09:07:09.162Z  
**Live origin:** https://www.mytutoringhub.com  
**Result:** FAIL (3 checks)

## Session-required (not run by this script)

No tutor/student credentials are used here. These remain **session-gated** and were not exercised live:

- Wizard → first Teaching Profile → live in search
- Dashboard create / edit / pause / activate, 3/10 meter, Listing Boost per profile, multi-value capabilities
- Messaging: one thread, listing context, no extra contact

Sign-in is required to message or save from public search (already observed on `/search?browse=1`).

## Public HTTP / DB checks

| Check | OK | Detail |
|-------|----|--------|
| Caps locked 3 / 10 | yes | FREE=3 PRO=10 BUSINESS.free=3 |
| No date-dependent listing-cap promo | yes | isSubjectProfilePromoActive=false |
| Source copy uses Teaching Profile | yes | Complete your profile to appear in search for free. Free tutors get up to 3 active Teaching Profiles, enquiries, and 100% of lesson fees — no subscription required for ordinary sea |
| Zero ACTIVE canonical collisions | yes | 0 ACTIVE collision groups / 106 listings |
| Unique index safe | yes | canApply=true |
| Partial unique index present | yes | SubjectProfile_active_tutor_canonical_uidx=true |
| Redirect rows exist (paused URLs preserved) | yes | 10 TeachingProfileRedirect rows |
| Live Homepage HTTP | NO | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=false len=145585 |
| Live Pricing HTTP | NO | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=false len=49638 |
| Live Become a tutor HTTP | yes | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=true len=37205 |
| Live Help HTTP | NO | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=false len=52924 |
| Live Login HTTP | yes | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=false len=31574 |
| Live Search browse HTTP | yes | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=true len=181935 |
| Live Search Mathematics HTTP | yes | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=true len=171461 |
| Live Search Cambridge A Level Maths 9709 HTTP | yes | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=true len=172054 |
| Live Search Lahore broad HTTP | yes | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=true len=170835 |
| Live Subject hub Maths HTTP | yes | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=false len=40685 |
| Merged listing 301/308 to survivor | yes | status=200 location=(none) metaRefresh=/listings/cmtdgosh30005hyhjjaq0a9ns rsc=/listings/cmtdgosh30005hyhjjaq0a9ns kind=next-rsc-308 expected contains cmtdgosh30005hyhjjaq0a9ns |
| Survivor listing reachable | yes | status=200 (200 public, 404 if parent tutor not listable) |
| Past papers hub | yes | status=200 |
| Past Papers Find-a-tutor CTA params | yes | status=200 href=/search?subject=Mathematics&amp;board=Cambridge+AS%2FA+Level&amp;level=A+Level&amp;syllabusCode=9709 |

## Redirect notes

Live `GET /listings/cmtdgoszf000bhyhj4ogze411` with `redirect: manual` is **HTTP 200** (no `Location`). The HTML includes `<meta id="__next-page-redirect" http-equiv="refresh" content="0;url=/listings/cmtdgosh30005hyhjjaq0a9ns">` and RSC digest `NEXT_REDIRECT;replace;/listings/cmtdgosh30005hyhjjaq0a9ns;308;`. That is a Next.js streaming 308, not a missing redirect. `generateMetadata` no longer calls `permanentRedirect`. Build-time HTTP 308s are added in `next.config.ts` from `TeachingProfileRedirect` rows.

Survivor `cmtdgosh30005hyhjjaq0a9ns` is HTTP 200. Parent tutor may still be unusable as a public card.

## Other public curl notes (this run)

- `/past-papers/cambridge/a-level/mathematics-9709` → 200; Find-a-tutor href `/search?subject=Mathematics&board=Cambridge+AS%2FA+Level&level=A+Level&syllabusCode=9709`
- `/s/mathematics` → 200
- `/become-a-tutor` → 200, already uses Teaching Profile copy
- `/login` → 200, title Log In, email + password fields (dashboard remains behind this)
- Homepage / pricing / help still say “teaching listings” on **live** until this copy deploy; source strings already say Teaching Profile

cursor-ide-browser MCP could not keep a tab open in this session; public checks used `curl` / `fetch` instead.
