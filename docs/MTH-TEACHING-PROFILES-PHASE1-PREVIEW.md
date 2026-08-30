# Teaching Profiles Phase 1 — migration preview

**Status:** LIVE COUNTS (read-only)  
**Generated:** 2026-08-30T07:04:52.298Z  
**Rows scanned:** 106

This report **does not** delete, merge, redirect, or pause listings. No `UPDATE` / `DELETE` / `INSERT` ran against `SubjectProfile`.

Canonical grouping uses `canonicalTeachingSubject()` (`src/lib/teaching-profile-subject.ts`): aliases (`Maths` → `Mathematics`), catalog resolve, exam-family prefixes (`GCSE Maths` → `Mathematics`), trailing syllabus codes (`Chemistry 5070` → `Chemistry`). Custom unmatched labels stay verbatim (case-insensitive key).

## Totals

| Metric | Count |
|--------|------:|
| `SubjectProfile` rows | 106 |
| ACTIVE | 77 |
| PAUSED | 29 |
| Other status | 0 |
| Distinct `tutorProfileId` with ≥1 listing | 33 |
| Tutors with no same-canonical duplicate rows | 26 |
| Tutors with 1 listing total | 19 |
| Tutors with 2+ listings (any subjects) | 14 |

## Same canonical subject (Phase 9 consolidation candidates)

These are **not** merged. They are the rows a future consolidation tool would group.

| Metric | Count |
|--------|------:|
| Same-canonical groups with 2+ rows (any status) | 9 |
| Tutors in those groups | 7 |
| Same-canonical groups with 2+ **ACTIVE** rows | 7 |
| Tutors blocked from the ACTIVE partial unique index | 5 |
| Groups where raw subject strings differ but canonical key matches (alias / exam-family) | 9 |

### Groups that would need capability union

A group “needs merging” on a dimension when 2+ distinct values exist across its rows (after skipping empty / All levels).

| Dimension | Groups with 2+ distinct values |
|-----------|-------------------------------:|
| Levels | 1 |
| Boards | 0 |
| Qualifications | 0 |
| Syllabus codes | 0 |
| Disagreeing listing rates | 1 |
| Two+ live Boost windows | 0 |
| Two+ live Highlight windows | 1 |

## Unique index applicability

Partial unique index (not Prisma `@@unique`):

```sql
CREATE UNIQUE INDEX "SubjectProfile_active_tutor_canonical_uidx"
  ON "SubjectProfile" ("tutorProfileId", (lower(btrim("canonicalSubject"))))
  WHERE status = 'ACTIVE' AND btrim("canonicalSubject") <> '';
```

**Can apply now against this database?** NO — wait for Phase 9 consolidation. The SQL migration skips the index when collisions exist.

Paused + ACTIVE of the same canonical subject remains allowed (product uniqueness is active-only). Pause-then-recreate should **reuse** the paused row in Phase 2/3 writers (not implemented here).

## Same-canonical groups (any status, 2+ rows)

| TutorProfile | Canonical | Rows | ACTIVE | Raw subjects | Levels | Boards | Quals | Codes | Listing ids | Boost until |
|---|---|---:|---:|---|---|---|---|---|---|---|
| `cmsx3iyd20002hekfp2q2g9r7` | Mathematics | 3 | 3 | CBSE Maths, IGCSE Maths, Mathematics | — | — | — | — | `cmtdgot50000dhyhjeevgb760` `cmtdgoszf000bhyhj4ogze411` `cmtdgosh30005hyhjjaq0a9ns` | — |
| `cmt49w2gc00021pm4lave66m1` | Chemistry | 2 | 2 | A Level Chemistry, Chemistry | — | — | — | — | `cmtdgp0eo002nhyhjmns50c8e` `cmtdgozsd002fhyhjs987otve` | — |
| `cmt70uv8700021sde1s0hz66v` | Chemistry | 2 | 2 | A Level Chemistry, Chemistry | Primary, Matric / SSC, O Level, University, A Level, FSc / HSSC / Intermediate | — | — | — | `cmtdgp2oc003dhyhjr1elgao5` `cmtdgp24s0037hyhjn3jteek9` | — |
| `cmt5r6dh90002u88x7uptwuq2` | Islamic Studies | 2 | 0 | Islamic Studies, Islamiyat | — | — | — | — | `cmtdgowrt001hhyhj46ohwq0w` `cmtdgowm8001fhyhjkedrge3g` | — |
| `cmt5s8mby000eglzbtqoibner` | Islamic Studies | 2 | 1 | Islamic Studies, Islamiyat | — | — | — | — | `cmtdgp75g004vhyhju5kwbgbm` `cmtdgp7m6004zhyhjp8u11vm1` | — |
| `cmswh5syz000fkusbev0xml1s` | Mathematics | 2 | 2 | Mathematics, O Level Maths | Secondary / O Level | — | — | — | `cmtdgouaq000phyhj2i059nhe` `cmtdgotzl000lhyhjte0fhah0` | — |
| `cmt49w2gc00021pm4lave66m1` | Mathematics | 2 | 2 | IGCSE Maths, O Level Maths | — | — | — | — | `cmtdgozms002dhyhj5hnunfyw` `cmtdgozbl0029hyhjtgoscb8g` | — |
| `cmt70uv8700021sde1s0hz66v` | Physics | 2 | 2 | A Level Physics, Physics | — | — | — | — | `cmtdgp329003hhyhj2tly8uj5` `cmtdgp2d60039hyhjiisedpb4` | — |
| `cmt76dgwy00028dkr65g4bfz2` | Physics | 2 | 2 | A Level Physics, Physics | — | — | — | — | `cmtdgp6oq004phyhjao3ni5ep` `cmtdgp5b20049hyhjx57i7pst` | — |


## ACTIVE collisions (block the unique index)

| TutorProfile | Canonical | Rows | ACTIVE | Raw subjects | Levels | Boards | Quals | Codes | Listing ids | Boost until |
|---|---|---:|---:|---|---|---|---|---|---|---|
| `cmsx3iyd20002hekfp2q2g9r7` | Mathematics | 3 | 3 | CBSE Maths, IGCSE Maths, Mathematics | — | — | — | — | `cmtdgot50000dhyhjeevgb760` `cmtdgoszf000bhyhj4ogze411` `cmtdgosh30005hyhjjaq0a9ns` | — |
| `cmt49w2gc00021pm4lave66m1` | Chemistry | 2 | 2 | A Level Chemistry, Chemistry | — | — | — | — | `cmtdgp0eo002nhyhjmns50c8e` `cmtdgozsd002fhyhjs987otve` | — |
| `cmt70uv8700021sde1s0hz66v` | Chemistry | 2 | 2 | A Level Chemistry, Chemistry | Primary, Matric / SSC, O Level, University, A Level, FSc / HSSC / Intermediate | — | — | — | `cmtdgp2oc003dhyhjr1elgao5` `cmtdgp24s0037hyhjn3jteek9` | — |
| `cmswh5syz000fkusbev0xml1s` | Mathematics | 2 | 2 | Mathematics, O Level Maths | Secondary / O Level | — | — | — | `cmtdgouaq000phyhj2i059nhe` `cmtdgotzl000lhyhjte0fhah0` | — |
| `cmt49w2gc00021pm4lave66m1` | Mathematics | 2 | 2 | IGCSE Maths, O Level Maths | — | — | — | — | `cmtdgozms002dhyhj5hnunfyw` `cmtdgozbl0029hyhjtgoscb8g` | — |
| `cmt70uv8700021sde1s0hz66v` | Physics | 2 | 2 | A Level Physics, Physics | — | — | — | — | `cmtdgp329003hhyhj2tly8uj5` `cmtdgp2d60039hyhjiisedpb4` | — |
| `cmt76dgwy00028dkr65g4bfz2` | Physics | 2 | 2 | A Level Physics, Physics | — | — | — | — | `cmtdgp6oq004phyhjao3ni5ep` `cmtdgp5b20049hyhjx57i7pst` | — |


## Groups whose boards would union

_None._


## Groups whose levels would union

| TutorProfile | Canonical | Rows | ACTIVE | Raw subjects | Levels | Boards | Quals | Codes | Listing ids | Boost until |
|---|---|---:|---:|---|---|---|---|---|---|---|
| `cmt70uv8700021sde1s0hz66v` | Chemistry | 2 | 2 | A Level Chemistry, Chemistry | Primary, Matric / SSC, O Level, University, A Level, FSc / HSSC / Intermediate | — | — | — | `cmtdgp2oc003dhyhjr1elgao5` `cmtdgp24s0037hyhjn3jteek9` | — |


## Query used

```sql
SELECT
  id,
  "tutorProfileId",
  subject,
  status,
  level,
  board,
  qualification,
  "syllabusCode",
  rate,
  "boostUntil",
  "highlightedUntil",
  title,
  "createdAt",
  "updatedAt"
FROM "SubjectProfile"
```

Expected columns: `id`, `tutorProfileId`, `subject`, `status`, `level`, `board`, `qualification`, `syllabusCode`, `rate`, `boostUntil`, `highlightedUntil`, `title`, `createdAt`, `updatedAt`.

Re-run:

```bash
npx tsx scripts/preview-teaching-profile-migration.ts
```
