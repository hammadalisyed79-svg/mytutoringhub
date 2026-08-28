# Marketplace Integrity — Current Production Snapshot

**Date:** 2026-08-23 (UTC)  
**Site:** mytutoringhub.com  
**Mode:** Read-only investigation — no writes, no emails, no visibility changes, no code deployed

---

## CURRENT SUPPLY

Counts from production database (`getTutorSupplyOverview` + full eligibility cross-check), snapshot **2026-08-23 ~10:18 UTC**.

| Metric | Count |
|--------|------:|
| Total tutor accounts (`role: TUTOR`) | **16** |
| Live / public (`publicListedTutorWhere`) | **1** |
| Incomplete / hidden (non-suspended, not live) | **13** |
| Suspicious hidden (display name fails `isSuspiciousDisplayName`) | **1** |
| Suspended tutors | **0** |
| Email-unverified hidden | **1** |
| `forceActive=true` | **0** |
| Complete but hidden (eligible except not active) | **0** |
| Incomplete but active (should be hidden) | **0** |

**Reconciliation:** 1 live + 15 hidden = 16 tutor profiles. Hidden breakdown: 13 incomplete + 1 suspicious + 1 unverified (categories overlap only by exclusion rules; suspicious and unverified are counted in their primary bucket).

**Supply note:** Marketplace is extremely thin — one public listing (Ali) carries all searchable subject supply.

---

## PUBLIC TUTORS

| Display name | Profile ID | Subjects | City | Country | Lesson mode | Hourly rate (PKR) | Email verified | Completeness | Verified badge | forceActive |
|--------------|------------|----------|------|---------|-------------|-------------------|----------------|--------------|----------------|-------------|
| Ali | `cmsx3iyd20002hekfp2q2g9r7` | Accounting, CBSE Maths, Computer Applications, Computer Science, IGCSE Maths, Mathematics | Online | Pakistan | Online | 5000 | Yes | 100% | No | No |

All other tutor accounts are hidden from the public catalogue.

---

## ELIGIBILITY CROSS-CHECK

Canonical functions used: `getTutorProfileCompletion`, `isSuspiciousDisplayName`, `isTutorProfileListable`, `computeDesiredTutorPublicActive` (`src/lib/tutor-public-eligibility.ts`).

| Category | Count | Notes |
|----------|------:|-------|
| **A — Valid public** (`active === desiredActive === true`) | **1** | Ali |
| **B — Hidden, correctly** (`!active && !desiredActive`) | **15** | Includes incomplete, suspicious, unverified |
| **C — Active but should be hidden** | **0** | — |
| **D — Hidden but should be public** | **0** | — |
| **E — forceActive override / manual review** | **0** | No `forceActive` profiles |

**Suspicious hidden (correctly excluded):** Don*卂乃ᗪㄩ尺乂ᗪ-ㄚㄒ* — profile fields complete (100%) but name blocked by `isSuspiciousDisplayName`; `active: false`.

**Visibility sync dry-run:** `scripts/sync-tutor-public-visibility.ts` (default dry-run) reports **0 mutations** — `active` flags match canonical desired state.

---

## PUBLIC QUERY AUDIT

| Surface | File | Uses `publicListedTutorWhere()` or equivalent? | Notes |
|---------|------|-----------------------------------------------|-------|
| `/search` | `src/lib/search-tutors.ts` → `searchTutors()` | **Yes** | Spread into all search variants |
| Homepage featured tutors | `src/app/(home)/page.tsx` | **Yes** | `findMany` + `count` |
| Homepage public tutor count | `src/app/(home)/page.tsx` | **Yes** | Same |
| Public tutor profile | `src/app/tutors/[id]/page.tsx` | **Partial** | `findUnique({ id })`; public access gated on `tutor.active` (+ owner/admin). Does **not** re-check `user.suspended` — relies on `active` staying in sync via `syncTutorBadges` |
| Similar tutors | `src/lib/search-tutors.ts` → `similarTutors()` | **Yes** | Not renderable today (only 1 public tutor) |
| Subject landing `/s/[subject]` | `src/app/s/[subject]/[[...city]]/page.tsx` | **Yes** (via `searchTutors`) | City variant same route |
| Location landing | — | **Yes** (via subject+city segment) | No standalone city-only landing |
| Sitemap tutor URLs | `src/app/sitemap.ts` | **Yes** | |
| Student welcome match | `src/lib/student-tutor-matches.ts` | **Yes** | |
| Email tutor picks | `src/lib/email-sequences.ts` → `fetchSuggestedTutors()` | **Yes** | |
| Subject index avg rates | `src/lib/search-tutors.ts` → `averageRateForSubject()` | **Partial** | Uses **active tutor ads** first (`tutorAd`); falls back to `publicListedTutorWhere()` profiles if no ads |
| Admin dashboard live count | `src/app/admin/page.tsx` | **No** | `active: true` only (admin/internal) |
| Admin API tutor count | `src/app/api/admin/route.ts` | **No** | Same (admin/internal) |

**No public marketing surface found using raw `active: true` without suspended check**, except the profile route’s indirect reliance on the `active` flag alone.

---

## SEARCH TESTS

Tests used only subjects with live supply (all map to Ali).

| Test | Expected (DB) | Search total | Names returned | Match |
|------|---------------|-------------|----------------|-------|
| Subject: Accounting | 1 | 1 | Ali | ✓ |
| Subject: CBSE Maths | 1 | 1 | Ali | ✓ |
| Subject: Computer Applications | 1 | 1 | Ali | ✓ |
| Subject: Computer Science | 1 | 1 | Ali | ✓ |
| Subject: IGCSE Maths | 1 | 1 | Ali | ✓ |
| Subject: Mathematics | 1 | 1 | Ali | ✓ |
| No subject filter | 1 | 1 | Ali | ✓ |
| Mode: online | 1 | 1 | Ali | ✓ |
| Country: Pakistan | 1 | 1 | Ali | ✓ |
| City filter | — | — | — | Skipped (public tutor city = `Online`, no non-online city to test) |

**Production UI check** (`/search?subject=Mathematics`): shows “1 tutor for Mathematics”, card for Ali — consistent with DB.

---

## SUBJECT LANDINGS

Subjects with ≥1 public tutor (all aliases of Ali’s subject list):

| Subject landing | DB/search count | Displayed tutors | Hidden tutors shown? | noindex |
|-----------------|----------------|------------------|----------------------|---------|
| `/s/mathematics` | 1 | Ali | No | No (has supply) |
| `/s/accounting` | 1 | Ali (via search) | No | No |
| `/s/computer-science` | 1 | Ali (via search) | No | No |
| `/s/igcse-maths` | 1 | Ali (via search) | No | No |
| `/s/cbse-maths` | 1 | Ali (via search) | No | No |
| `/s/computer-applications` | 1 | Ali (via search) | No | No |

**Production check** (`/s/mathematics`): “1 tutor available”, Ali listed, indexed (not noindex).

Zero-tutor subject pages were not exhaustively crawled; existing `subjectLandingShouldNoIndex(total)` behavior unchanged.

---

## SIMILAR TUTORS

Only **one** public tutor exists, so the Similar Tutors block does not render related listings in production.

**Code path:** `similarTutors()` uses `publicListedTutorWhere()` — no weaker filter found.

| Profile tested | Related tutors | Result |
|----------------|----------------|--------|
| Ali (`cmsx3iyd20002hekfp2q2g9r7`) | *(none — sole public tutor)* | N/A |

---

## PROFILE / SEARCH PRESENTATION

### Automated + production visual check (Ali)

| Defect | Severity | Where |
|--------|----------|-------|
| **Duplicate “Online” in availability string** — `Online, Pakistan · Online` | **Medium** | Search card, profile hero, contact sidebar (`formatTutorAvailability` when `location=Online`, `country=Pakistan`, `online=true`) |
| **Subject ad rate ≠ profile rate** — profile €16.55/hr; subject listing “General private lessons” shows €4.96/hr | **Medium** | Profile page subject listings (likely stale/low `tutorAd` rate vs `hourlyRate`) |
| **Subject landing average rate mismatch** — page copy “Average rate around €6.62/hr” vs card €16.55/hr | **Low** | `/s/mathematics` (`averageRateForSubject` uses active ads before profile rates) |
| Typo in tutor-written bio (“vide” vs “wide”) | — | **Not reported** (user content; out of scope) |

### Not found

- `/hr` duplicated with “per hour” on profile/search cards
- Broken avatar
- Empty headline / empty subjects
- Card overflow on tested viewports
- Verified badge placement issues (no verified tutors)

### Email presentation (code review only)

`tutorPickListHtml` in `src/lib/email-sequences.ts` appends `/hr` after `formatHourly()` which already includes `/hr` — potential **Low** duplicate in tutor-pick emails (not visually verified).

---

## SITEMAP

| Check | Result |
|-------|--------|
| Public tutors in DB | **1** |
| Tutor URLs in production sitemap | **1** (`/tutors/cmsx3iyd20002hekfp2q2g9r7`) |
| IDs match | **Yes** |
| Hidden tutors in sitemap | **0** |
| Suspicious hidden in sitemap | **0** (Don excluded) |
| Inactive direct URL | **404** + `noIndex` metadata (tested Jennifer Alex hidden profile `cmswio06b0002w4tkh9kapz3p`) |

---

## RECOVERY STATUS

**Recovery Email 1** (`tutor_profile_r1`) admin send: **2026-08-23 ~09:47 UTC** (from `AdminAuditLog`).

| Metric | Value |
|--------|------:|
| Eligible at execution | 13 |
| Successfully sent (R1 events in DB) | **10** |
| Became ineligible at send | **1** |
| Failed sends | **2** |
| Already received (duplicate run) | 0 |

### Post-Email-1 snapshot (all 10 R1 recipients)

| Display name | Still incomplete | Completeness | Edited since R1 | Now live | Band |
|--------------|------------------|--------------|-----------------|----------|------|
| Jennifer Alex | Yes | 70% | No | No | Nearly complete |
| neelam khatri Bakle | Yes | 50% | No | No | Mid |
| wasiq Saleem | Yes | 50% | No | No | Mid |
| Annapurna Tiwari | Yes | 50% | No | No | Mid |
| Mohit kwatra | Yes | 50% | No | No | Mid |
| vikas singh | Yes | 50% | No | No | Mid |
| Thamizharasi Av | Yes | 50% | No | No | Mid |
| Rachpal Nirmale | Yes | 50% | No | No | Mid |
| Madhu Shakthi | Yes | 90% | No | No | Nearly complete (photo only) |
| Hammad Syed | Yes | 50% | No | No | Mid |

**Summary**

| Metric | Count |
|--------|------:|
| Still incomplete | **10 / 10** |
| Edited profile since R1 | **0** |
| Became live since R1 | **0** |
| Nearly complete (≥70%, still incomplete) | **2** (Jennifer Alex, Madhu Shakthi) |
| Early profile (<40%) | **0** |

**Correlation note:** R1 was sent ~30 minutes before this audit. No profile `updatedAt` after R1 for any recipient — **no evidence of profile edits attributable to Email 1 yet** (timing too short to infer causation).

### Not sent R1 (from batch of 13)

| Display name | Reason |
|--------------|--------|
| Ali Raza | In batch but no R1 event — **failed or ineligible at send** (see below) |
| Falak Shair | In batch but no R1 event — **failed or ineligible at send** |
| Majibur Rahman | In batch but no R1 event — **failed or ineligible at send** |

Excluded before batch: Reema Naz (email unverified), Don*…* (suspicious name). Ali (company tutor) was already live.

---

## FAILED EMAILS

**Source:** `AdminAuditLog` detail for `send_recovery_email_1` — no per-recipient failure table in DB; failed sends release `EmailSequenceEvent` (no row).

| Aggregate | Count |
|-----------|------:|
| Became ineligible at execution | 1 |
| Failed (exception after claim, event rolled back) | 2 |

**Recipients without R1 event from the 13-person execution cohort:** Ali Raza, Falak Shair, Majibur Rahman (display names only; addresses not recorded here).

| Classification | Count | Evidence |
|----------------|------:|----------|
| Ineligible at send-time recheck (`complete` / `not_started` / `ineligible`) | **1** | `classifyReminderResult` → `becameIneligible`; no persistent per-user reason stored |
| Transient provider / unknown send failure | **2** | `sendEmail` threw → `releaseEmailEvent`; logged as `[recovery-email-1] send failed` with user id only |
| Invalid recipient / hard rejection | **Unknown** | Requires Vercel/server log inspection — not in DB |
| Configuration error | **Unlikely** | 10/13 sends succeeded; `emailConfigured()` true |

**No email addresses are included in this report.**

---

## NEXT REMINDERS

From `src/lib/email-nurture.ts` (`runNurtureDigest` cron):

| Step | Sequence | Timing (implemented) | Prerequisites |
|------|----------|----------------------|---------------|
| **R2** | `tutor_profile_r2` | **≥2 days after R1 `sentAt`** | No prior R2; tutor not suspended |
| **R3** | `tutor_profile_r3` | **≥5 days after R1 `sentAt`** | **R2 must already be sent**; no prior R3 |
| **R4** | `tutor_profile_r4` | **≥7 days after R3 `sentAt`** (~day 14 from R1 path) | No prior R4 |

**Exclusion before each send:** `sendTutorProfileReminderEmail` returns early (no send) if tutor is suspended, unverified, profile not started, or **profile already complete** (`getTutorProfileCompletion().complete`). Completing profile or going live prevents further profile reminders.

**R1 for this cohort:** Earliest R2 eligibility ≈ **2026-08-25** (2 days after 2026-08-23 send), subject to daily cron batch (40/run).

---

## DEFECTS REQUIRING A PATCH

1. **Medium — Duplicate “Online” in availability display**  
   `formatTutorAvailability` produces `Online, Pakistan · Online` when city is `Online` and `online=true`. Affects search cards and profile. Fix in `src/lib/tutor-catalog.ts`.

2. **Medium — Tutor ad rate inconsistent with profile rate on public profile**  
   Ali’s subject listing shows €4.96/hr vs profile €16.55/hr. Data or sync issue between `tutorAd.rate` and `hourlyRate`.

3. **Low — Subject landing average rate misleading**  
   `averageRateForSubject` prefers ad rates; headline average (€6.62) diverges from profile card (€16.55) on `/s/mathematics`.

4. **Low — Email tutor picks may double `/hr`**  
   `tutorPickListHtml` uses `${formatHourly(...)}/hr` in `src/lib/email-sequences.ts`.

5. **Low — Public profile route weaker than catalogue filter**  
   Profile page checks `active` only, not `user.suspended` directly. Safe while sync is correct; fragile if `active` drifts.

6. **Informational — No similar-tutor leakage test possible**  
   Only one public tutor; code path looks correct but multi-tutor regression untested in production.

**No Critical defects** (no hidden tutors in search/sitemap; no eligibility mismatches).

---

## NO-CHANGE CONFIRMATION

| Action | Performed? |
|--------|------------|
| Database writes | **No** |
| Emails sent | **No** |
| Profile visibility changed | **No** |
| Eligibility rules changed | **No** |
| Code deployed | **No** |
| Tutors activated/hidden | **No** |

**Artifacts produced (local, not committed):** `tmp_marketplace_integrity_audit.json`, `tmp_recovery_failed_analysis.mjs`, `tmp_sitemap_fetch.xml` — read-only audit helpers only.

---

**End of report.** No fixes implemented per instructions.
