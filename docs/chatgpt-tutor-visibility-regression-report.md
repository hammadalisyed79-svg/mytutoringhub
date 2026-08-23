# My Tutoring Hub — Tutor Visibility Regression Report

**For:** ChatGPT re-review  
**Date:** 23 August 2026  
**Related:** `docs/chatgpt-tutor-catalogue-report.md`, `docs/chatgpt-mobile-a11y-route-qa-report.md`  
**Code commit:** (this change set)  
**Database action:** one-time visibility sync applied via CLI after detector fix  

---

## ROOT CAUSE

**Primary: VALIDATION GAP** in `isSuspiciousDisplayName()`.

The public profile used a decorative Unicode obfuscation:

`Don*卂乃ᗪㄩ尺乂ᗪ-ㄚㄒ*`

Character scripts mixed in a single token:

| Glyph | Script |
|-------|--------|
| `Don` | Latin |
| `*` | Common |
| `卂乃尺乂` | Han |
| `ᗪ` | Canadian Aboriginal |
| `ㄩㄚㄒ` | Bopomofo |

Those Han / Bopomofo / Canadian Aboriginal characters are Unicode **letters** (`\p{L}`). The previous detector counted them toward a high “letter ratio”, so the name was treated as a legitimate international name.

Downstream effects (not separate root bugs):

1. `isTutorProfileListable()` returned **true**
2. `computeDesiredTutorPublicActive()` returned **desiredActive: true**
3. Catalogue Integrity sync correctly left the profile public (C=0) — it trusted the detector
4. `syncTutorBadges` / paid `TUTOR_BASIC` could keep `active: true` because listable was true (paid did **not** bypass completeness; the name simply passed validation)

**Not the cause:**

- `forceActive` was **false**
- Public queries already used `publicListedTutorWhere()` (`active: true` + non-suspended)
- No evidence of a query bypass or admin override for this profile

---

## SUSPICIOUS NAME VALIDATION

### Before

```text
isSuspiciousDisplayName("Don*卂乃ᗪㄩ尺乂ᗪ-ㄚㄒ*") === false
```

Why it passed:

- Letter ratio ≫ 0.45 (lookalike letters counted)
- Only two `*` characters (symbol-run rule required 3+)
- No URL / zero-width controls
- NFKC does not fold these ideographs/syllabics to Latin

### After

Detection now also flags (without rewriting stored names):

1. **NFKC inspection** for detection only (stored name unchanged)
2. **Confusable letter forms** — fullwidth Latin, mathematical alphanumerics, enclosed alphanumerics
3. **Same-token Latin + lookalike/homoglyph scripts** — Canadian Aboriginal, Bopomofo, Han, Gothic, Runic, Deseret, Cyrillic, Greek  
   Space-separated bilingual names like `John 王` remain allowed
4. **Asterisk-heavy / wrapped handles** — two or more `*` or `*…*` wrapping

```text
isSuspiciousDisplayName("Don*卂乃ᗪㄩ尺乂ᗪ-ㄚㄒ*") === true
→ listable false → desiredActive false
```

---

## PROFILE UNDER INVESTIGATION (no PII)

| Field | Value |
|-------|--------|
| TutorProfile ID | `cmszs2z0n0006rfenbufw47yh` |
| User ID | `cmszs1xwk0000rfenf1la5uim` |
| Display name | `Don*卂乃ᗪㄩ尺乂ᗪ-ㄚㄒ*` |
| active (before) | `true` |
| active (after sync) | `false` |
| forceActive | `false` (unchanged) |
| emailVerified | yes |
| Profile completion | complete (no missing required fields) |
| Suspicious name (before / after) | false → **true** |
| Plan | `TUTOR_BASIC` (ACTIVE) |
| Listing fields | Biology · Lahore, Pakistan · online · rate present · photo present |

### Eligibility function results (before code fix)

| Function | Result |
|----------|--------|
| `getTutorProfileCompletion` | complete |
| `isSuspiciousDisplayName` | **false (bug)** |
| `isTutorProfileListable` | **true (because of above)** |
| `computeDesiredTutorPublicActive` | **desiredActive true** |

### After code fix (pre-sync)

| Function | Result |
|----------|--------|
| `isSuspiciousDisplayName` | **true** |
| `isTutorProfileListable` | **false** |
| `computeDesiredTutorPublicActive` | **desiredActive false**, block `suspicious_display_name` |

---

## ACTIVE / FORCEACTIVE TRACE

Writers capable of setting `TutorProfile.active` / `forceActive`:

| Path | Behavior | Verdict |
|------|----------|---------|
| `syncTutorBadges` | `active = forceActive \|\| listable` | Correct; depended on detector |
| `api/profile/tutor` create | `active: listable` then `syncTutorBadges` | Correct |
| Admin activate/deactivate | sets `active` + `forceActive` together | Intentional override |
| Suspend / delete flows | force inactive | OK |
| Register / OAuth tutor create | `active: false` | OK |
| Settings account close | `active: false` | OK |
| Stripe / Safepay / plan checkout | call `syncTutorBadges` only | Do **not** force-active; would only re-list if listable |
| Seed company | seed-only | N/A production |

**No paid-plan reactivation bypass** beyond “listable was wrongly true”. After the detector fix, `syncTutorBadges` will keep this profile inactive unless admin `forceActive`.

---

## PUBLIC QUERY TRACE

Canonical helper: `publicListedTutorWhere()` → `{ active: true, user: { suspended: false } }`.

Confirmed wired into:

- `/search` (`search-tutors.ts`)
- Homepage featured + count (`page.tsx`)
- Sitemap tutor URLs
- Similar / related tutor picks in search helpers
- Student tutor matches
- Email tutor picks

Raw `active: true` counts in admin dashboards remain admin-only.

`/tutors/[id]` continues to `notFound()` for non-owner/admin when `active` is false.

**No public query bypass found for this regression.**

---

## FIX

| File | Change |
|------|--------|
| `src/lib/display-name.ts` | Targeted anti-obfuscation rules; NFKC for detection only |
| `src/lib/business-rules.test.ts` | Exact Don* case + international script matrix |
| `src/lib/tutor-public-eligibility.test.ts` | Eligibility regression + intl names |

No hard-coded profile ID blacklist. No name rewrite in DB. No payment/subscription changes.

---

## CATALOGUE RESYNC

### Dry-run after detector fix

| Metric | Value |
|--------|------:|
| Evaluated | 16 |
| Unchanged | 15 |
| Would hide (C) | **1** (`cmszs2z0n0006rfenbufw47yh`, reason `suspicious_display_name`) |
| Would show (D) | 0 |
| forceActive overrides | 0 |
| Manual review (E) | 1 (Ali short bio — unrelated) |

### Apply

```text
UPDATED cmszs2z0n0006rfenbufw47yh: active true → false (suspicious_display_name)
Applied 1 visibility updates. forceActive unchanged.
```

### Idempotent dry-run after apply

| Metric | Value |
|--------|------:|
| C | **0** |
| D | **0** |
| Unchanged | 16 |

---

## INTERNATIONAL NAME TESTS

| Name / script | Expected | Result |
|---------------|----------|--------|
| `Sara Ahmed` (Latin) | eligible | PASS |
| `محمد أحمد` (Arabic/Urdu) | eligible | PASS |
| `王小明` (Chinese) | eligible | PASS |
| `山田太郎` (Japanese Kanji) | eligible | PASS |
| `やまだ たろう` (Hiragana) | eligible | PASS |
| `김민수` (Korean) | eligible | PASS |
| `Иван Петров` (Cyrillic) | eligible | PASS |
| `François Müller` (accented Latin) | eligible | PASS |
| `John 王` (spaced bilingual) | eligible | PASS |
| `Don*卂乃ᗪㄩ尺乂ᗪ-ㄚㄒ*` | **rejected** | PASS |
| Fullwidth / Latin+Cyrillic homoglyph samples | rejected | PASS |

---

## PRODUCTION VERIFICATION

After sync (+ code deploy):

| Surface | Expected | Result |
|---------|----------|--------|
| `/search` | Don* absent | Verify post-deploy |
| Homepage featured | Don* absent | Verify post-deploy |
| Direct `/tutors/cmszs2z0n0006rfenbufw47yh` | not public (`notFound` for guests) | Verify post-deploy |
| Sitemap | ID absent when inactive | Verify post-deploy |
| Legitimate `Ali` listing | still public | Preserved (manual-review short bio only) |

---

## DATA SAFETY

**Only production field changed:**

```text
TutorProfile.active: true → false
  where id = cmszs2z0n0006rfenbufw47yh
```

Unchanged:

- `forceActive`
- display name / bio / photo / rates
- subscriptions / payments
- user account

---

## TEST RESULTS

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| `business-rules` / display-name tests | PASS |
| `tutor-public-eligibility` tests | PASS |
| `tutor-catalog.availability` tests | PASS |
| `npm run lint` | 28 pre-existing problems (unchanged debt; not expanded for this fix) |

---

## NEXT RECOMMENDED SPRINT

Recommend only — **do not execute automatically:**

1. Optional deeper homoglyph catalogue (confusables list) if more spam variants appear  
2. Performance sprint (deferred)  
3. SEO expansion (deferred)  

Catalogue integrity for this obfuscation class is restored; stop here.
