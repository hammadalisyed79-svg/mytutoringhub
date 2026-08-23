# Tutor Recovery Campaign Preparation Report

**Date:** 2026-08-23  
**Data refresh:** production DB via `npx tsx scripts/tutor-recovery-campaign-prep.ts`

---

## CURRENT RECOVERY AUDIENCE

| Metric | Count |
| --- | ---: |
| Total incomplete tutors (supply overview) | **14** |
| Eligible recovery candidates | **13** |
| Inactive profiles scanned | 15 |
| Suspicious excluded | **1** |
| Unverified email excluded | **1** |
| Suspended excluded | **0** |
| Already-live excluded | **0** |
| Complete-but-hidden excluded | **0** |

No private email addresses are listed in this report.

---

## COMPLETION SEGMENTS

Based on canonical `getTutorProfileCompletion()` missing required count:

| Band | Definition | Count |
| --- | --- | ---: |
| Nearly complete | 1–2 requirements missing | **2** |
| Partially complete | 3–4 requirements missing | **1** |
| Early profile | 5+ requirements missing | **10** |

---

## MISSING REQUIREMENTS

Aggregate (a tutor may count in multiple rows):

| Requirement | Candidates missing it |
| --- | ---: |
| Profile photo | **13** |
| Country / city | **12** |
| Highest qualification | **11** |
| Subjects | **10** |
| Headline | **10** |
| Bio / about | 0 |
| Hourly rate | 0 |
| Lesson type | 0 |
| Name | 0 |
| Multiple missing (≥2) | **12** |

---

## SUBJECT INFORMATION

| | Count |
| --- | ---: |
| Eligible candidates **with** subjects selected | **3** |
| Eligible candidates **with no subjects yet** | **10** |

Open student demand (real OPEN ads): **Mathematics (1)**, **Chemistry (1)**.

**No-subject messaging:** Email 1 explicitly elevates subject selection when Subjects is among missing fields, without claiming subjects alone activate the listing.

---

## PRIORITY RECOVERY GROUP

**Count: 2**

Rationale (real data only):

1. **Nearly complete** (photo-only or photo + country).
2. Already selected **Chemistry** and/or **Mathematics** (or related) with **matching open student demand**.
3. Profiles already started; legitimate names (recovery audience already excludes suspicious).

Redacted priority sample (first name + domain only):

| Tutor | Domain | Subjects (summary) | % | Missing | Demand match |
| --- | --- | --- | ---: | --- | --- |
| Madhu | gmail.com | Chemistry + Maths-family + more | 90 | Profile photo | Chemistry |
| Ali | mytutoringhub.com | Mathematics, Physics, O Level Maths | 80 | Profile photo, Country | Mathematics |

Other subjects are not excluded from Email 1 audience — priority is for focus/manual follow-up.

---

## EMAIL 1

**Subject:** `Complete your My Tutoring Hub tutor profile`  
**CTA:** `Complete my profile`  
**Maps to:** existing nurture sequence `tutor_profile_r1` (template updated).

**Body (polished meaning):**  
Your tutor account on My Tutoring Hub exists, but your profile is not currently visible to students in search. Where subjects are still missing, add the subjects you teach first, then finish any other remaining listing details so your profile can become eligible for tutor search. Completing these steps does not guarantee students immediately — it makes you eligible when all requirements are met. This is not a rejection.

Dynamically lists a short “Still needed” set from canonical missing fields.

---

## EMAIL 2

**Subject:** `Finish your tutor profile on My Tutoring Hub`  
**CTA:** `Finish my tutor profile`  
**Timing:** ~2 days after Email 1 if still incomplete (`tutor_profile_r2`).

**Body:** Short reminder that the profile is still hidden; completing remaining details can make it eligible to appear in tutor search. Includes condensed missing list.

---

## EMAIL 3

**Subject:** `Complete your My Tutoring Hub tutor profile`  
**CTA:** `Complete my profile`  
**Timing:** ~5 days after Email 1 if still incomplete (`tutor_profile_r3`, cron keyed off R1 + 5 days).

**Body:** Respectful final note; no fake urgency; explicitly no account-deletion threat; condensed missing list.

---

## PERSONAL FOLLOW-UP

**Shortlist count: 3** (admin-only; no private contacts in this report).

Why these deserve manual follow-up:

1. **Madhu** — 90% complete; only photo missing; Chemistry demand match.  
2. **Ali** — 80% complete; photo + country; Mathematics demand match.  
3. **Jennifer** — has subjects (Biology / Human Biology / General Science); 3 fields left; good conversion candidate even without open ads.

Do **not** auto-WhatsApp. Use `/admin/tutors?supply=incomplete` for contact details inside admin.

---

## ADMIN REVIEW

Before any send, review:

1. **`/admin/tutor-supply`** — Recovery campaign preview panel (audience, exclusions, bands, Email 1 subject/CTA, **SEND STATUS: NOT SENT**).
2. **`/admin/tutors?supply=incomplete`** — Candidate completion + missing fields.
3. **`/admin/nurture?profile=1`** — Prior profile nurture send history (avoid double-messaging).
4. **CLI:** `npx tsx scripts/tutor-recovery-campaign-prep.ts` → refreshes `tmp_tutor_recovery_campaign_prep.json` (no full emails).

---

## SEND STATUS

# **NOT SENT**

No bulk email was executed.  
Nurture cron was not triggered manually.  
No production tutors were contacted in this task.

---

## NEXT ACTION

**Exact admin action to launch Email 1 (do not perform here):**

1. Sign in as admin and re-check `/admin/tutor-supply` campaign preview.  
2. Confirm `/admin/nurture?profile=1` for anyone who already received `tutor_profile_r1`.  
3. Either:
   - Wait for the **scheduled** onboarding/nurture digest cron (`/api/digests/onboarding` per `vercel.json`) to send `tutor_profile_r1` to eligible tutors under existing rules, **or**
   - Perform an **explicit** one-off admin send of profile reminder step 1 only if/when you add or use a guarded admin send control — **do not** run a mass script casually against production.
4. After Email 1, allow ~2 days then Email 2 (R2), then ~5 days from Email 1 for Email 3 (R3).

**Stop.** Do not start tutor acquisition ads, student marketing, SEO campaigns, or another engineering sprint until Email 1 is intentionally approved and launched by an admin.
