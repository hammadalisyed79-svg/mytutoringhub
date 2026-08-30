# Teaching Profiles Phase 10 — production verification

**Generated:** 2026-08-30T10:24:15.357Z  
**Live origin:** https://www.mytutoringhub.com  
**Result:** PASS

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
| Live Homepage HTTP | yes | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=true len=144895 |
| Live Pricing HTTP | yes | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=true len=49704 |
| Live Become a tutor HTTP | yes | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=true len=37223 |
| Live Help HTTP | yes | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=true len=53032 |
| Live Login HTTP | yes | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=false len=31574 |
| Live Search browse HTTP | yes | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=true len=181935 |
| Live Search Mathematics HTTP | yes | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=true len=171461 |
| Live Search Cambridge A Level Maths 9709 HTTP | yes | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=true len=172054 |
| Live Search Lahore broad HTTP | yes | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=true len=170835 |
| Live Subject hub Maths HTTP | yes | status=200 cliffCopy=false extraSkuCopy=false teachingProfileCopy=false len=40685 |
| Merged listing 301/308 to survivor | yes | status=308 location=/listings/cmtdgosh30005hyhjjaq0a9ns metaRefresh=(none) rsc=(none) kind=http-308 expected contains cmtdgosh30005hyhjjaq0a9ns |
| Survivor listing reachable | yes | status=200 (200 public, 404 if parent tutor not listable) |
| Past papers hub | yes | status=200 |
| Past Papers Find-a-tutor CTA params | yes | status=200 href=/search?subject=Mathematics&amp;board=Cambridge+AS%2FA+Level&amp;level=A+Level&amp;syllabusCode=9709 |

## Redirect notes

After this deploy, merged listing URLs return a **classic HTTP 308** with `Location` (from `next.config.ts` `redirects()` loaded from `TeachingProfileRedirect`). Example: `cmtdgoszf000bhyhj4ogze411` → `/listings/cmtdgosh30005hyhjjaq0a9ns`. `generateMetadata` does not call `permanentRedirect`. Page-level `permanentRedirect` remains a fallback.

## Other public curl notes

- `/past-papers/cambridge/a-level/mathematics-9709` → 200; Find-a-tutor href includes `subject=Mathematics`, `board=Cambridge AS/A Level`, `level=A Level`, `syllabusCode=9709`
- `/s/mathematics` → 200
- `/become-a-tutor` → 200, Teaching Profile copy
- `/login` → 200; `/dashboard/tutor` unauthenticated → meta refresh to `/login?next=/dashboard/tutor`
- Homepage / pricing / help use Teaching Profile; no 3→1 cliff; Extra Profile Ads is not sold as a +1 SKU
- Live browse search (2026-08-30 re-audit): 2 Teaching Profiles (one tutor, max 2 on broad search). Mathematics / 9709 search: 0 public matches with working zero-result CTA.
