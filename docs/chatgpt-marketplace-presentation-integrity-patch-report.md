# Marketplace Presentation + Integrity Patch Report

**Date:** 2026-08-23 (UTC)  
**Scope:** Code-only fixes from `docs/chatgpt-marketplace-integrity-current-report.md`  
**Production DB modified:** **No**

---

## AVAILABILITY

**Root cause:** `formatTutorAvailability()` appended `· Online` even when the place string already represented online-only tutoring (`location = "Online"`).

| Input | Before | After |
|-------|--------|-------|
| `Online` + `Pakistan` + `online=true` | `Online, Pakistan · Online` | `Online, Pakistan` |
| `Lahore` + `Pakistan` + `online=true` | `Lahore, Pakistan · Online` | `Lahore, Pakistan · Online` (unchanged) |
| `Lahore` + `Pakistan` + `online=false` | `Lahore, Pakistan` | `Lahore, Pakistan` (unchanged) |
| no city + `Pakistan` + `online=true` | `Pakistan · Online` | `Pakistan · Online` (unchanged) |
| `Online` only + `online=true` | `Online` | `Online` (unchanged) |

**File:** `src/lib/tutor-catalog.ts` — shared formatter used by search cards, profile hero, and contact sidebar.

---

## RATE SEMANTICS

### What the fields mean (from existing product code)

| Field | Semantics | Set / edited where |
|-------|-----------|-------------------|
| **`TutorProfile.hourlyRate`** | Canonical tutor profile rate (PKR). Used across search cards, profile hero, contact sidebar, homepage, subject landing cards. | Tutor profile form (`/api/profile/tutor`) |
| **`TutorAd.rate`** | Per-subject **listing** rate for a tutor’s marketplace ad. Tutors can set a different rate per subject when creating/editing ads. | Seeded from `hourlyRate` on first ad creation only (`/api/profile/tutor`); thereafter editable via `TutorAdsManager` / `/api/tutor-ads` PATCH. **No automatic sync** when profile `hourlyRate` changes. |

`TutorAd.rate` is intentionally subject-specific in the tutor dashboard, but **stale ad rows must not drive student-facing catalogue pricing** when they diverge from the public profile rate without explanation.

### Authoritative public pricing (after patch)

| Surface | Source |
|---------|--------|
| Search cards | `TutorProfile.hourlyRate` |
| Profile hero / contact sidebar | `TutorProfile.hourlyRate` |
| Profile subject listings (public) | `TutorProfile.hourlyRate` (was incorrectly showing `TutorAd.rate`) |
| Subject landing cards | `TutorProfile.hourlyRate` |
| Subject landing “average rate” | `averageRateForSubject()` → mean of **public-listed** profiles’ `hourlyRate` |
| Tutor dashboard ads manager | `TutorAd.rate` (unchanged — tutor-facing) |
| Email tutor picks | `TutorProfile.hourlyRate` via `fetchSuggestedTutors()` |

---

## STALE RATE DATA

**Not modified.** Rows flagged for manual admin review:

| Tutor | Profile ID | `hourlyRate` (PKR) | Ad | Ad `rate` (PKR) | Issue |
|-------|------------|-------------------|-----|-----------------|-------|
| Ali (public) | `cmsx3iyd20002hekfp2q2g9r7` | **5000** | “General private lessons” (`cmsx3p53k0013n8435kk3kqhw`) | **1500** | Ad rate stale vs profile; caused misleading subject listing before patch |
| Ali Raza (hidden) | `cmswh5syz000fkusbev0xml1s` | — | “Mathematics” ad | **2000** | Hidden tutor’s ad was included in old `averageRateForSubject()` (ads-first, no public filter) |

**Recommended admin action:** Review whether Ali’s General ad rate should be updated to 5000 PKR, or whether subject-specific pricing is intentional. Hidden tutors’ ads should never affect public averages (now enforced in code).

---

## SUBJECT AVERAGES

**Before:** `averageRateForSubject()` queried **all** `ACTIVE` tutor ads matching the subject string, regardless of tutor public eligibility. For Mathematics this returned **2000 PKR** (~€6.62/hr) from a hidden tutor’s ad — contradicting the sole public tutor’s **5000 PKR** (~€16.55/hr) card.

**After:** Averages computed only from `publicListedTutorWhere()` profiles whose `subjects` contain the label, using `hourlyRate`. With one public Mathematics tutor (Ali), `/s/mathematics` average aligns with his visible card rate (~€16.55/hr).

**File:** `src/lib/search-tutors.ts`

---

## PROFILE HARDENING

**Before:** Public access gated on `tutor.active` only (+ owner/admin bypass). Metadata used the same weak check.

**After:** Ordinary visitors require `canViewTutorProfilePublicly()` — combines `active`, `user.suspended`, and `computeDesiredTutorPublicActive()` (email verified, listable, non-suspicious name, complete profile, or `forceActive`).

- **Owner/admin preview preserved:** owners and admins can still view non-public profiles for dashboard review.
- **Canonical helper reused** — no new eligibility implementation.

**Files:** `src/lib/tutor-public-eligibility.ts`, `src/app/tutors/[id]/page.tsx`

---

## EMAIL /HR

**Defect confirmed:** `tutorPickListHtml` used `${formatHourly(...)}/hr` while `formatHourly()` already returns a string ending in `/hr`.

**Fix:** Removed duplicate `/hr` suffix in `src/lib/email-sequences.ts`.

**No emails sent during this patch.**

---

## SIMILAR TUTORS

No behavior change. `similarTutors()` already used `publicListedTutorWhere()`. Extracted `similarTutorsWhereClause()` for focused regression testing that hidden/ineligible tutors cannot enter the where clause.

---

## TESTS

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **Pass** |
| `npm run build` | **Pass** |
| `npx tsx src/lib/tutor-catalog.availability.test.ts` | **Pass** (incl. `Online, Pakistan` case) |
| `npx tsx src/lib/tutor-public-eligibility.test.ts` | **Pass** (incl. `canViewTutorProfilePublicly`) |
| `npx tsx src/lib/search-tutors.test.ts` | **Pass** (`similarTutorsWhereClause` uses public filter) |
| `npx tsx src/lib/email-sequences.render.test.ts` | **Pass** (no `/hr/hr`) |

---

## PRODUCTION

Post-deploy verification checklist (mytutoringhub.com):

| Check | Expected |
|-------|----------|
| `/search?subject=Mathematics` | 1 tutor (Ali); availability without duplicate Online |
| `/tutors/cmsx3iyd20002hekfp2q2g9r7` | Public profile loads; subject listing rate matches hero |
| `/tutors/cmswio06b0002w4tkh9kapz3p` | 404 for public visitors (Jennifer Alex) |
| `/s/mathematics` | Count = 1; average rate ≈ profile card rate |
| `/sitemap.xml` | Only public tutor URL |
| Recovery campaign | Unchanged |

---

## DATABASE

| Action | Performed? |
|--------|------------|
| Tutor `active` flags changed | **No** |
| Rates / profiles modified | **No** |
| Emails sent | **No** |
| Tutors activated | **No** |
| Recovery campaign altered | **No** |

All fixes are **code-only**. Stale `TutorAd` rows listed above remain for manual admin review.

---

**End of patch report.**
