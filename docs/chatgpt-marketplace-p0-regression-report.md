# Marketplace P0 Regression + Commercial Consistency Report

**Date:** 2026-08-26 (UTC)  
**Site:** https://www.mytutoringhub.com  
**Mode:** Stage A read-only DB audit → Stage B code-only fixes for confirmed defects  
**Authority:** Current production database at audit time (not historical counts)

---

## ROOT CAUSE

**No active P0 marketplace integrity regression** was found in the core public catalogue at audit time.

- `active === true` tutors (12) **exactly matched** canonically listable tutors (12).
- Homepage count and `/search` total both derived from `publicListedTutorWhere()` + `filterCanonicallyPublicTutors()` and **agreed (12)**.
- Zero suspicious, unverified, suspended, or incomplete tutors were exposed in search results.
- Rate and location formatters showed **no duplicate `/hr` or `Online · Online`** in DB-driven formatter checks.

**Confirmed non-P0 gaps fixed in Stage B:**

1. **Help FAQ duplicate sentence** — “Student Pass unlocks unlimited messaging” appeared twice in the contact-tutor answer (via `STUDENT_FREE_CONTACTS_LINE` + repeated clause).
2. **Terms Stripe reference** — Public terms mentioned Stripe fallback; **no `STRIPE_*` env vars** exist on Vercel Production.
3. **Weaker eligibility on two secondary surfaces** — `fetchSuggestedTutors()` (recommendation emails) and `getStudentWelcomeMatch()` counts used `publicListedTutorWhere()` counts only, without `filterCanonicallyPublicTutors()`. No violation today (`activeButIneligible: 0`) but would mis-count if `active` drifted.

**Not a code defect (documented):** Four public tutors display `verified: true` without an `APPROVED` `VerificationRequest` row — consistent with **admin manual badge grant** (`verify_approve` or admin tutor actions). Code review confirms **`VERIFIED_TUTOR` subscription does not set `verified`** (`syncTutorBadges` preserves admin-reviewed flag only).

---

## CURRENT SUPPLY

Snapshot from `scripts/marketplace-p0-audit.ts` against production DB at **2026-08-26 ~12:35 UTC**:

| Metric | Count |
|--------|------:|
| Total tutor accounts (`role: TUTOR`) | **30** |
| `active: true` | **12** |
| Canonically public (listable + verified email + not suspended + not suspicious) | **12** |
| Incomplete (any required field missing) | 17 |
| Suspicious display name (hidden) | 0 |
| Email-unverified tutor accounts | 5 |
| Suspended tutors | 2 |
| Active but canonically ineligible | **0** |
| Canonically eligible but inactive | **0** |
| Complete but hidden | 1 |

**Invariant:** `PUBLIC === CANONICALLY LISTABLE` — **PASS** (0 `activeViolations`).

External check alignment: homepage “12 Active tutors” and `/search` “12 tutors” match this snapshot.

---

## HOMEPAGE VS SEARCH

| Surface | Calculation | Count at audit |
|---------|-------------|----------------|
| **Homepage** “Active tutors” | `findMany(publicListedTutorWhere())` → `filterCanonicallyPublicTutors()` → `.length` | **12** |
| **`/search`** “*n* tutors” | `searchTutors()` → same where + post-filter → `total` | **12** |

Both use the same canonical population semantics. **No change required.**

---

## ELIGIBILITY

All **12** tutors returned by unfiltered production search passed `isCanonicallyPublicTutor()`:

- Email verified ✓  
- Not suspended ✓  
- Not suspicious name ✓  
- Profile listable (canonical completion) ✓  
- `active` matches `computeDesiredTutorPublicActive()` ✓  

**Public ineligible tutors exposed:** **0**

---

## SUSPICIOUS NAME PROTECTION

Representative helper tests (`isSuspiciousDisplayName` / `computeDesiredTutorPublicActive`):

| Pattern | Hidden |
|---------|--------|
| Decorative Unicode / stylized spam | ✓ Yes |
| Symbol-heavy / gibberish | ✓ Yes |
| Legitimate international names (Arabic, CJK, Cyrillic, etc.) | ✓ Allowed |

**Public suspicious tutors:** **0**

No hard-coded names; existing regression tests retained in `tutor-public-eligibility.test.ts`.

---

## PUBLIC QUERY SURFACES

| Surface | Canonical helper | Post-filter |
|---------|------------------|-------------|
| `/search` | `publicListedTutorWhere()` | `filterCanonicallyPublicTutors()` ✓ |
| Homepage tutor count | ✓ | ✓ |
| Homepage Featured Tutors | ✓ | ✓ |
| `/tutors/[id]` | `canViewTutorProfilePublicly()` | N/A (route gate) ✓ |
| Similar tutors | ✓ | ✓ |
| `/s/[subject]` (via `searchTutors`) | ✓ | ✓ |
| Sitemap tutor URLs | ✓ | ✓ |
| Student welcome match counts | ✓ | **Fixed** — now canonical count |
| Tutor recommendation emails | ✓ | **Fixed** — now canonical filter |
| Admin dashboards | Raw `active: true` | Intentional (internal) |

Subject/city/country landings route through `searchTutors()`.

---

## VERIFIED BADGES

- **Public tutors with `verified: true` checked:** **9**
- **Displayed in search with Verified badge:** matches `tutor.verified` DB flag
- **Invalid badges (verified without approved verification request):** **4** — admin-grant path; **no code change** (do not modify production records)
- **`VERIFIED_TUTOR` plan purchase → verified badge:** **No** (confirmed in `syncTutorBadges`)

Purchasing verification priority does **not** create the badge; admin review or explicit admin grant does.

---

## RATE FORMAT

**Defect found:** No  
Production formatter audit: **0** duplicate `/hr` patterns in search result set.  
Shared formatter: `formatHourly()` → `"${money}/hr"` once.  
Regression test: `marketplace-p0-regression.test.ts`, `email-sequences.render.test.ts`.

---

## LOCATION FORMAT

**Defect found:** No  
Production formatter audit: **0** `Online · Online` duplicates.  
Shared formatter: `formatTutorAvailability()` / `formatTutorPlace()` in `tutor-catalog.ts`.  
Regression test: `tutor-catalog.availability.test.ts`, `marketplace-p0-regression.test.ts`.

---

## FREE LISTING RULE

Audited copy aligns with rule: **complete eligible tutor → free basic listing**; Tutor Basic = priority/ads/reveals.

| Page | Status |
|------|--------|
| Homepage / Help / Terms / Become a tutor / Pricing / Free vs paid | Consistent |
| Tutor Basic required for **ads** only (not basic search listing) | Correct in code + copy |

**No copy contradictions requiring change** beyond Terms Safepay/Stripe wording (below).

---

## SAFEPAY WORDING

| Area | Current state | Change |
|------|---------------|--------|
| Help payments FAQ | “billed through Safepay **when live**” + manual activation | ✓ Acceptable during onboarding |
| Pricing (sandbox) | “Card checkout launching soon / manual activation” | ✓ Correct |
| Terms §3 | Previously cited “Stripe fallback” | **Fixed** — now Safepay when live + manual activation until then |
| Stripe env on Vercel | **None configured** | Stripe reference removed from public terms |

Safepay merchant approval still pending (business process, not code).

---

## HELP COPY

**Duplicate confirmed:** “Student Pass unlocks unlimited messaging” appeared twice in “How do I contact a tutor?”  
**Fixed:** second clause shortened to “Student Pass also unlocks request ads.”

---

## TESTS

| Command | Result |
|---------|--------|
| `npx tsx src/lib/tutor-public-eligibility.test.ts` | Pass |
| `npx tsx src/lib/marketplace-p0-regression.test.ts` | Pass |
| `npx tsx src/lib/tutor-catalog.availability.test.ts` | Pass |
| `npx tsx src/lib/email-sequences.render.test.ts` | Pass |
| `npm run build` | Pass |

New/retained scenarios: A–L per task (eligibility, suspicious, verified, rate, location, homepage/search parity, featured subset).

---

## PRODUCTION VERIFICATION

**Pre-deploy DB audit (authoritative):**

| Check | Value |
|-------|------:|
| Homepage-style public count | 12 |
| Search total | 12 |
| Same population | Yes |
| Suspicious exposed | 0 |
| Incomplete exposed | 0 |
| Unverified exposed | 0 |
| Suspended exposed | 0 |
| Duplicate `/hr` in formatters | 0 |
| Duplicate Online in formatters | 0 |
| Invalid verified badges (admin-grant note) | 4 without request row |

Re-run after deploy: `npx tsx scripts/marketplace-p0-audit.ts`

---

## DATABASE

**Confirm:** No tutor profile fields, rates, verification approvals, `active` flags, subscriptions, or student accounts were modified during this task.

(Ali ad rate alignment from an earlier session is outside this sprint scope.)

---

## EMAILS

**Confirm:** **ZERO** recovery, nurture, or recommendation emails were sent during this task.

---

## STAGE B CODE CHANGES

| File | Change |
|------|--------|
| `src/app/help/page.tsx` | Remove duplicate Student Pass sentence |
| `src/app/terms/page.tsx` | Remove Stripe fallback; clarify Safepay/manual activation |
| `src/lib/email-sequences.ts` | Canonical filter on suggested tutors |
| `src/lib/student-tutor-matches.ts` | Canonical count for welcome match |
| `src/lib/marketplace-p0-regression.test.ts` | New regression tests |
| `scripts/marketplace-p0-audit.ts` | Repeatable read-only audit tool |

---

## ARTIFACTS

- `tmp_marketplace_p0_audit.json` — local audit output (not committed)
- `scripts/marketplace-p0-audit.ts` — committed audit script

**STOP** — No Past Papers cleanup, MTH Secure Payments, or redesign initiated.
