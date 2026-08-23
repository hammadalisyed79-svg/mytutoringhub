# My Tutoring Hub — Tutor Catalogue Integrity Sprint Report

**For:** ChatGPT re-review  
**Date:** 23 August 2026  
**Related:** `docs/chatgpt-audit-sprint-report.md`, `docs/chatgpt-production-integrity-report.md`  
**Code commit (helpers + script):** to be pushed with this report  
**Database action:** one-time visibility sync applied via CLI (see below)

---

## CURRENT ELIGIBILITY LOGIC

Source of truth (unchanged semantics):

`src/lib/subscription.ts` → `syncTutorBadges` / `isTutorProfileListable`  
`src/lib/tutor-profile-completion.ts` → `getTutorProfileCompletion`  
`src/lib/display-name.ts` → `isSuspiciousDisplayName`

### Desired public `active` flag

```text
active = forceActive || (emailVerified && isTutorProfileListable(profile, name))
```

Paid plans **do not** set `active`. They only affect ranking / ads / reveals.

### Completeness fields (actual code)

Required by `getTutorProfileCompletion`:

| Field | Rule |
|-------|------|
| Name | trim length ≥ 2 |
| Profile photo | `https://` URL |
| Headline | trim length ≥ 8 |
| About you (bio) | trim length ≥ 40 |
| Country | trim length ≥ 2 |
| City (`location`) | trim length ≥ 2 |
| Subjects | non-empty |
| Hourly rate | ≥ 500 (PKR base units) |
| Lesson type | `online` or `inPerson` |
| Highest qualification | non-empty |

Plus:

- **Email verified** (`User.emailVerified` truthy)
- **Display name** must not fail `isSuspiciousDisplayName()` (Unicode-safe; non-Latin scripts allowed)

### Direct profile URL behavior (existing)

`src/app/tutors/[id]/page.tsx`:

- Inactive profile → `notFound()` for non-owner / non-admin
- Owner/admin can still view
- Metadata sets `noIndex: !tutor.active`

---

## FORCEACTIVE

### Current semantics (documented, **not changed**)

Admin actions `activate_tutor` / `deactivate_tutor` set:

```text
{ active, forceActive: active }
```

`syncTutorBadges` keeps:

```text
active = forceActive || listableWithEmail
```

So `forceActive === true` is an **intentional admin override** that can keep a profile public even if incomplete / unverified / suspicious-name.

### This sprint

- **Did not** clear or rewrite `forceActive`
- Dry-run found **0** `forceActive` overrides among evaluated tutors
- Suspicious/incomplete profiles were hidden because `forceActive` was false

---

## DRY RUN

Command (default = dry-run, zero writes):

```bash
npx tsx scripts/sync-tutor-public-visibility.ts
# npm run db:sync-tutor-visibility
```

| Metric | Count |
|--------|------:|
| Tutors evaluated | 16 |
| Unchanged | 4 |
| Would become hidden (C) | 12 |
| Would become public (D) | 0 |
| **A** Correctly public | 1 |
| **B** Correctly hidden | 2 |
| **C** Public → should hide | 12 |
| **D** Hidden → should show | 0 |
| **E** Manual review (no visibility flip) | 1 |
| `forceActive` overrides | 0 |

### Why the 12 would hide

All 12 were `active: true` but failed ordinary listability. Common reasons:

- missing Profile photo (all 12)
- missing Headline / Country / Subjects / Highest qualification (most)
- 1 also `email_unverified`

**All 12 had a paid tutor plan flag in subscriptions, confirming payment does not bypass quality.**

No unexpected mass flip of legitimate complete free tutors. Safe to apply.

---

## VISIBILITY CHANGES (APPLIED)

Command:

```bash
npx tsx scripts/sync-tutor-public-visibility.ts --apply
```

| Direction | Count |
|-----------|------:|
| Public → hidden | **12** |
| Hidden → public | **0** |

### Reasons (aggregated, no emails)

| Reason | Profiles affected (approx.) |
|--------|-----------------------------|
| incomplete:Profile photo | 12 |
| incomplete:Headline | 10 |
| incomplete:Country | 11 |
| incomplete:Subjects | 9 |
| incomplete:Highest qualification | 10 |
| email_unverified | 1 |

`forceActive` unchanged on all rows.

### Post-apply idempotency

Re-ran dry-run:

- evaluated 16  
- unchanged 16  
- C=0, D=0  
- A=1, B=14, E=1  

---

## PUBLIC QUERY AUDIT

| Surface | Filter before | Change this sprint |
|---------|---------------|--------------------|
| `/search` (`searchTutors`) | `active` + not suspended (+ emailVerified) | Now uses `publicListedTutorWhere()` = `active` + not suspended |
| Homepage featured / count | `active: true` only | Now `publicListedTutorWhere()` |
| Similar tutors | `active` + not suspended + emailVerified | Now `publicListedTutorWhere()` |
| Sitemap tutor URLs | `active` + not suspended | Now `publicListedTutorWhere()` |
| Student welcome match counts | `active` + not suspended | Now `publicListedTutorWhere()` |
| Email “tutor picks” | `active` + not suspended | Now `publicListedTutorWhere()` |
| Past Paper CTA | Links to `/search?subject=` (no separate tutor query) | N/A |

Canonical helper added: `publicListedTutorWhere()` in `src/lib/tutor-public-eligibility.ts`  
Visibility boolean helper: `computeDesiredTutorPublicActive()` (mirrors `syncTutorBadges` without writes)

---

## PRODUCTION VERIFICATION

After DB sync (same database used by production app):

| Check | Result |
|-------|--------|
| `/search` public tutor link count | **2** (matches A+E still public) |
| Incomplete profiles previously listed | No longer in search result links |
| Hidden profile direct URL | App uses `notFound()` for guests; loading shell may flash; metadata `noIndex` when inactive |
| Paid incomplete still listed? | **No** (confirmed by dry-run + apply) |
| Free complete eligible? | Remains eligible under rules (1 correctly public + 1 short-bio manual review still public) |

---

## DATA SAFETY

| Changed | Not changed |
|---------|-------------|
| `TutorProfile.active` only (12 rows true→false) | Users, emails, passwords |
| | `forceActive` |
| | Subscriptions / payments |
| | Bios, names, rates, subjects, photos |
| | Messages, reviews |
| | No deletes |

Script design:

- Dry-run by default  
- Explicit `--apply` for mutations  
- `--force-large` required if hide ratio > 75% and N > 20  
- No HTTP endpoint  
- Idempotent  

---

## TEST RESULTS

| Check | Result |
|-------|--------|
| `npx tsx src/lib/tutor-public-eligibility.test.ts` | **Pass** |
| `npx tsc --noEmit` | **Pass** |
| `npm run build` | **Pass** |
| `npm run lint` | **Fails** with pre-existing debt (SiteNav effect, tutor-badges prefer-const, unused vars). Not introduced as build blockers. |

New unit coverage includes:

- complete + verified + valid name → eligible  
- incomplete + verified → not eligible  
- complete + unverified → not eligible  
- suspicious name → not eligible  
- incomplete (paid-irrelevant) → not eligible  
- free complete verified → eligible  
- `forceActive` override  
- international (Arabic) name valid  

---

## MANUAL REVIEW

| Count | Reason (no PII beyond display name class) |
|------:|-------------------------------------------|
| 1 | `short_bio_manual_review` — technically listable; bio &lt; 80 chars |

No automatic hide for weak copy alone beyond existing completeness thresholds.

---

## FILES ADDED / CHANGED

### New
- `src/lib/tutor-public-eligibility.ts`
- `src/lib/tutor-public-eligibility.test.ts`
- `scripts/sync-tutor-public-visibility.ts`
- `docs/chatgpt-tutor-catalogue-report.md` (this file)

### Updated (query consistency only)
- `src/app/page.tsx`
- `src/lib/search-tutors.ts`
- `src/app/sitemap.ts`
- `src/lib/student-tutor-matches.ts`
- `src/lib/email-sequences.ts`
- `package.json` → `db:sync-tutor-visibility`

---

## NEXT RECOMMENDED SPRINT

Recommend only — **do not execute here**:

1. Optional admin UI list of incomplete-but-paid tutors (nudge to finish profile)  
2. Light email nurture copy sweep for residual old plan wording  
3. Then mobile / a11y / performance backlog  

---

## SUMMARY

Catalogue sync brought `TutorProfile.active` into agreement with the already-shipped listing rules. **12** incomplete (including paid) profiles were hidden from public search; **0** were newly published; `forceActive` untouched; accounts remain intact. Public queries now share `publicListedTutorWhere()`. Sprint stops here.
