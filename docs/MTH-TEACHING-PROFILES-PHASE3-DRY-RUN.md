# Teaching Profiles Phase 3 — consolidation dry-run

**Status:** PREVIEW ONLY (no writes)  
**Generated:** 2026-08-30T08:49:20.950Z  
**Execute:** `false`  
**Rows scanned:** 106

This script does **not** merge, redirect, pause, or delete Teaching Profiles. `/listings/{id}` URLs are unchanged. Unique index is **not** applied.

## Survivor selection (preview only — not executed)

When two or more Teaching Profiles share a TutorProfile + canonical subject, Phase 9 may later keep **one** row and 301 the others. Until then this is documentation + dry-run output only.

Priority (first match wins):

1. **Live Listing Boost** — keep the row whose `boostUntil` is still in the future. Boost is paid visibility on a specific `/listings/{id}`; dropping that URL would strand a purchase.
2. **Live Highlight** — else keep the row with a live `highlightedUntil` window.
3. **Most complete capabilities** — else keep the row with the largest distinct set of levels + boards + qualifications + syllabus codes (join rows if present, otherwise scalar cache). Completeness preserves exam-family data that V2 stored on separate listings.
4. **Oldest public URL** — else keep the earliest `createdAt` so the longest-lived `/listings/{id}` stays the canonical URL.
5. **Tie-break** — lexicographically smallest id.

Conflicts the dry-run **records** but does not resolve:

- Disagreeing listing rates → survivor keeps its rate; others are noted.
- Two+ live Boost windows → survivor keeps its window; other windows are flagged (Phase 9 must decide extend-vs-drop).
- Two+ live Highlight windows — same.

**Not done by this tooling**

- No `UPDATE` / `DELETE` / status change.
- No redirects.
- No unique index apply.
- Leftover `TutorProfile.subjects` CSV tags are listed as “do not auto-create”.


## Counts

| Metric | Count |
|--------|------:|
| Teaching Profiles | 106 |
| Same-canonical groups (any status) | 9 |
| ACTIVE collision groups | 0 |
| Unique index safe to apply | yes |
| Leftover CSV tutors (not exploded) | 0 |

## What WOULD merge

| TutorProfile | Canonical | Would keep | Would redirect | Capability union | Rate conflict | Boost conflict | Reasons | Execute |
|---|---|---|---|---|---|---|---|---|
| `cmsx3iyd20002hekfp2q2g9r7` | Mathematics | `cmtdgosh30005hyhjjaq0a9ns` | `cmtdgoszf000bhyhj4ogze411` `cmtdgot50000dhyhjeevgb760` | — | no | no | oldest public URL (earliest createdAt) | false |
| `cmt49w2gc00021pm4lave66m1` | Chemistry | `cmtdgozsd002fhyhjs987otve` | `cmtdgp0eo002nhyhjmns50c8e` | — | no | no | oldest public URL (earliest createdAt) | false |
| `cmt70uv8700021sde1s0hz66v` | Chemistry | `cmtdgp24s0037hyhjn3jteek9` | `cmtdgp2oc003dhyhjr1elgao5` | LEVEL:Primary | no | no | most complete capabilities; oldest createdAt as tie-break among remaining rules | false |
| `cmt5r6dh90002u88x7uptwuq2` | Islamic Studies | `cmtdgowm8001fhyhjkedrge3g` | `cmtdgowrt001hhyhj46ohwq0w` | — | no | no | oldest public URL (earliest createdAt) | false |
| `cmt5s8mby000eglzbtqoibner` | Islamic Studies | `cmtdgp75g004vhyhju5kwbgbm` | `cmtdgp7m6004zhyhjp8u11vm1` | — | yes | no | oldest public URL (earliest createdAt) | false |
| `cmswh5syz000fkusbev0xml1s` | Mathematics | `cmtdgotzl000lhyhjte0fhah0` | `cmtdgouaq000phyhj2i059nhe` | LEVEL:Secondary / O Level | no | no | live Highlight window; oldest createdAt as tie-break among remaining rules | false |
| `cmt49w2gc00021pm4lave66m1` | Mathematics | `cmtdgozbl0029hyhjtgoscb8g` | `cmtdgozms002dhyhj5hnunfyw` | — | no | no | oldest public URL (earliest createdAt) | false |
| `cmt70uv8700021sde1s0hz66v` | Physics | `cmtdgp2d60039hyhjiisedpb4` | `cmtdgp329003hhyhj2tly8uj5` | — | no | no | oldest public URL (earliest createdAt) | false |
| `cmt76dgwy00028dkr65g4bfz2` | Physics | `cmtdgp5b20049hyhjx57i7pst` | `cmtdgp6oq004phyhjao3ni5ep` | — | no | no | oldest public URL (earliest createdAt) | false |

## Leftover master CSV (do not explode into extra Teaching Profiles)

_None._

Re-run:

```bash
npx tsx scripts/dry-run-teaching-profile-consolidation.ts
```
