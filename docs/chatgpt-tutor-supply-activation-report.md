# Tutor Supply + Activation Sprint Report

**Date:** 2026-08-23  
**Goal:** Product mechanisms toward **50 quality public tutor profiles** without lowering standards.  
**Fake data:** None created. **Bulk email:** Not sent.

---

## CURRENT SUPPLY

Real production database snapshot (`scripts/tutor-supply-snapshot.ts`):

| Metric | Count |
| --- | ---: |
| Tutor accounts | **16** |
| Live / public | **1** |
| Incomplete (hidden, non-suspicious) | **14** |
| Suspended tutors | **0** |
| Suspicious / manual-review hidden | **1** |
| Unverified email (among hidden) | **1** |
| Never started profile | **1** |
| Live profiles updated in last 7 days | **1** |

Milestone gap: **49** quality live tutors remaining to reach 50.

---

## ACTIVATION FUNNEL

### Existing flow (preserved)

Account create → email verify → complete `getTutorProfileCompletion` fields → `syncTutorBadges` sets `active` when email verified + listable → public search via `publicListedTutorWhere()`.

### Changes this sprint

1. Tutor dashboard shows a clear **status card** (LIVE / INCOMPLETE / SUSPENDED) driven by canonical eligibility — never “live” from subscription alone.
2. Profile editor checklist uses **`getTutorProfileCompletion()`** (+ email gate) instead of a parallel ad-hoc percent.
3. Save → go-live redirects to growth tab with success moment (`?live=1`).
4. `/become-a-tutor` conversion copy + CTA **Create your tutor profile**.
5. Student requests called out on the tutor growth tab.
6. Admin **Tutor supply** desk + incomplete filters + recovery dry-run tooling.

---

## PROFILE COMPLETION UX

Tutors now see a **Your tutor profile** card with:

- Percent complete (required listing gates)
- Steps remaining
- Checklist: email verified, photo, headline, bio, country, city, subjects, rate, lesson type, qualifications (+ clear-name row when needed)
- CTA **Complete my profile** or, when live, **View public profile** / **Improve profile**
- Preview link that does **not** make incomplete tutors searchable

Form sections: Basic information, Profile photo, Location, Subjects & levels, Online/in-person & rate, Qualifications — with bio/headline/photo guidance. Subject picker remains catalog-only (no taxonomy rewrite).

---

## ONBOARDING

- Easy account creation unchanged; public listing still requires full eligibility.
- Student → tutor switch lands on `/dashboard/tutor?tab=profile`.
- Logged-in tutors hitting `/become-a-tutor` go to the profile tab (not invite hash only).
- Go-live success acknowledges activation **before** pushing paid upgrades.

---

## RECOVERY AUDIENCE

Dry-run (`npx tsx scripts/tutor-recovery-dry-run.ts`) — **no emails sent**:

| | |
| --- | ---: |
| Eligible outreach candidates | **13** |
| Inactive profiles scanned | 15 |
| Excluded suspicious names | 1 |
| Excluded unverified email | 1 |

Sample missing fields (domains only in logs): photo, headline, country, subjects, qualifications — common blockers.

---

## EMAIL

- Existing nurture sequences retained (`tutor_profile_r1`–`r4`, never-started, live).
- Incomplete template/subject updated: **Complete your My Tutoring Hub tutor profile** — clarifies account exists, not visible yet, CTA to editor; does not say “rejected.”
- **Nothing mass-sent** in this sprint. Bulk send remains explicit admin/nurture cron action only.

---

## ADMIN SUPPLY VIEW

- `/admin/tutor-supply` — overview, recovery dry-run counts, subject gap table.
- `/admin/tutors` — supply filters: incomplete follow-up, suspicious name, suspended; completion columns.
- Admin nav + overview link to Tutor supply.

---

## ANALYTICS

Project uses **Vercel Analytics** only (no custom event API in codebase).

**Recommended events (not implemented — avoid new analytics platform):**

- `tutor_signup_started` / `tutor_signup_completed`
- `tutor_profile_started` / `tutor_profile_50` / `tutor_profile_complete` / `tutor_profile_live`
- `tutor_profile_viewed` / `tutor_contact_received`

Instrument later via Vercel custom events or first-party DB counters when growth experiments need them.

---

## SUPPLY GAP

From real open ads vs live tutors (top signals):

| Subject | Live | Incomplete | Open student requests |
| --- | ---: | ---: | ---: |
| Chemistry | 0 | 1 | 1 |
| Mathematics | 1 | 1 | 1 |
| Biology | 0 | 2 | 0 |
| (no subjects yet) | 0 | 11 | 0 |
| Physics / A Level Physics / O Level Maths / etc. | 0 | 1–2 | 0 |

**Recruitment priority:** convert the **11 tutors with no subjects yet** plus Chemistry/Maths demand; do not spread effort evenly across every curriculum label.

---

## FILES CHANGED

Important paths:

- `src/lib/tutor-profile-status.ts` (+ tests)
- `src/lib/tutor-recovery-audience.ts` (+ tests)
- `src/lib/tutor-supply-metrics.ts`
- `src/components/TutorProfileStatusCard.tsx`
- `src/components/TutorProfileForm.tsx`
- `src/app/dashboard/tutor/page.tsx`
- `src/app/become-a-tutor/page.tsx`
- `src/app/admin/tutors/page.tsx`
- `src/app/admin/tutor-supply/page.tsx`
- `src/lib/email.ts` / `email-nurture.ts`
- `scripts/tutor-recovery-dry-run.ts` / `tutor-supply-snapshot.ts`

Eligibility / completeness / suspicious-name / forceActive / suspension rules: **unchanged**.

---

## TEST RESULTS

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |
| `tutor-profile-status.test.ts` | Pass |
| `tutor-recovery-audience.test.ts` | Pass |
| `tutor-public-eligibility.test.ts` | Pass |
| `npm run lint` | 29 problems (9 errors, 20 warnings) — pre-existing debt |

---

## PRODUCTION VERIFICATION

After deploy, verify:

1. Tutor dashboard status card (incomplete vs live copy)
2. `/become-a-tutor` CTA copy
3. `/admin/tutor-supply` metrics match snapshot order of magnitude
4. No automatic mass email fired

---

## NEXT RECOMMENDED GROWTH ACTION

**Do not start student acquisition campaigns yet.**

1. Explicit admin-approved **profile-completion outreach** to the ~13 recovery candidates (photo + subjects are the common blockers).
2. Personal follow-up to convert incomplete tutors who already teach Chemistry/Maths.
3. Only after live supply rises meaningfully, open student demand campaigns into those subjects.

---

*Engineering optimization remains CLOSED. This sprint is product growth only.*
