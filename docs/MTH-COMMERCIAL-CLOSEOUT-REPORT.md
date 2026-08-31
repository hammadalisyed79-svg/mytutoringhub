# MTH — COMMERCIAL CLOSEOUT REPORT

**Date:** 2026-08-31  
**Repo:** `C:\Tutor`  
**Prior verdict:** FINAL COMMERCIAL MODEL — ACTION REQUIRED  

---

## A. Executive verdict

### MTH COMMERCIAL FOUNDATION — CLOSED

Launch-critical closeout items are implemented:

1. Existing Free tutors with >1 ACTIVE Teaching Profiles are **grandfathered** (derived ratchet; no deletes/pauses).  
2. New Free capacity stays **1**; clear Pro upgrade message.  
3. Priority Verification Review **reorders** the admin queue (priority first, oldest first).  
4. Referral +1 contact **deferred**; public copy does not promise it.  
5. GA4 conversion catalog + client beacons + purchase dedupe on receipt/paper success.  
6. Past Papers: global fee PKR 100; metadata no longer claims blanket “Free Download”.  
7. Commercial/unit tests + typecheck pass.  

**Ops note:** Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` in production if not already present so gtag loads. Code is ready without inventing a second analytics stack.

**Hard stop:** Teaching Profiles Phase 1 / schema migration **not started**.

---

## B. Existing Free tutor grandfather implementation

**Approach (no schema migration):**

`resolveCreateTeachingProfileCap(planCap, activeCount)` for Free:

`effectiveCreateCap = max(1, activeCount)`

| State | Create/reactivate |
|-------|-------------------|
| 3 ACTIVE | blocked (cap 3) |
| pause → 2 | blocked (cap 2) |
| pause → 1 | blocked (cap 1) |
| 0 ACTIVE | may create **1** |

- Plan entitlement remains Free=1 / Pro=10.  
- `enforceSubjectProfileCap` **never auto-pauses Free** tutors.  
- Boost never adds capacity.  
- UX block copy: **“Upgrade to Tutor Pro to create up to 10 Teaching Profiles.”**

Files: `src/lib/teaching-profile-cap.ts`, `src/lib/subject-profile-entitlements.ts`.

---

## C. Production counts (read-only, earlier audit still valid)

From `scripts/audit-free-tutor-cap-impact.ts` (Postgres):

| Metric | Count |
|--------|------:|
| Free tutors | 16 |
| Free with 0 ACTIVE | 7 |
| Free with 1 ACTIVE | 3 |
| Free with 2 ACTIVE | 3 |
| Free with 3+ ACTIVE | 3 |
| **Grandfathered Free (>1 ACTIVE)** | **6** |
| Tutor Pro holders | 15 |

Those 6 remain searchable; they cannot grow while Free.

---

## D. Free=1 enforcement verification

- Create/reactivate gate uses grandfather create cap.  
- Non-grandfathered Free at 0 → may create exactly one.  
- Editing existing ACTIVE profiles unrestricted.  
- Viewing paused/historical unrestricted.  

---

## E. Priority Verification queue implementation

`dedupeVerificationQueue` now sorts:

1. PENDING + active `VERIFIED_TUTOR` entitlement  
2. Other PENDING  
3. Within each: **oldest `createdAt` first**  
4. Resolved history after  

Admin UI shows **“Priority queue”** badge. Payment still never sets `verified`.

Tests: `src/lib/verification-queue.test.ts`.

---

## F. Referral feature status — DEFERRED

- Student Free = **3** new contacts/month (unchanged).  
- Public `REFERRAL_LINE` = Hub Points only (no +1 contact promise).  
- `applyReferralSignup` remains unwired — **DEFERRED GROWTH FEATURE**.  

---

## G. Google Ads / GA4 event map

| Event | Funnel |
|-------|--------|
| `student_registration` | Register success (student) |
| `tutor_registration` | Register success (tutor) |
| `tutor_search` | Search results page |
| `teaching_profile_view` | Public `/listings/{id}` |
| `student_tutor_contact` | Message create success |
| `tutor_enquiry_received` | Same success (tutor-side signal) |
| `student_request_created` | Student request POST success |
| `student_pass_purchase` / `student_pro_purchase` | Receipt |
| `tutor_pro_activation` | Receipt (value 0 if complimentary) |
| `listing_boost_purchase` | Receipt |
| `priority_verification_purchase` | Receipt |
| `past_paper_purchase` | `/past-papers?checkout=success` |
| `tutor_email_verified` | Verify-email JSON success |
| `tutor_profile_completed` | Dashboard `live=1` |
| `teaching_profile_activated` | Teaching Profile create success |

Loader: `GoogleAnalytics` when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set. Vercel Analytics retained.

---

## H. Events actually implemented

All 16 catalog events above are wired to success paths (not checkout-open). Failed actions do not fire.

---

## I. Primary vs secondary Google Ads recommendation

**Primary (student acquisition):**  
`student_tutor_contact`, `student_request_created`, `student_pass_purchase`, `student_pro_purchase`  
(+ optional commercial: `past_paper_purchase`)

**Secondary / observation:**  
registration, search, profile view, tutor onboarding milestones, enquiry received  

**Tutor-growth campaigns (later primary):**  
`tutor_profile_completed`, `teaching_profile_activated`, `tutor_pro_activation`, `listing_boost_purchase`

Do **not** mark page_view / scroll / generic CTA as primary.

---

## J. Purchase deduplication

`ConversionBeacon` / `fireConversionEvent` use `sessionStorage` key `mth_ga_once_{dedupeKey}`:

- Receipt: `purchase_{subscriptionId}`  
- Past paper: `paper_{catalogKey|token}`  
- Other actions: conversation/listing/request ids  

Refresh / receipt revisit does not re-fire in the same browser session.

Complimentary Tutor Pro: `value = 0`, `payment_source = complimentary`.

---

## K. Safepay / manual / promo tracking

Receipt params include `payment_source`: `safepay` | `complimentary` (heuristic on zero amount / complimentary flags). Manual offline activations that land on receipt with zero charge record **0 value**.

---

## L. Past Papers final check

| Check | Result |
|-------|--------|
| SiteSettings fee | **PKR 100** |
| UI when fee > 0 | Shows localized fee (not “Free”) |
| fee === 0 branch | Exists but not live (fee is 100) |
| Pass 10 / Pro unlimited | Unchanged, aligned |
| Metadata “Free Download” | **Removed** from `/past-papers` title |
| Bulk DB update | **Not performed** |
| Indexed “FREE” syllabus pages | Treat as **SEARCH INDEX CACHE / RECRAWL REQUIRED** unless a page still renders Free with fee=100 |

---

## M. /how-it-works live verification

Repository uses Teaching Profile / Tutor Pro / Listing Boost.  
After deploy, confirm production HTML has no “Tutor Basic” / “subject ads” / “Boost or highlight”.  
If Google still shows old snippets → **recrawl**, not more code edits.

---

## N. Tests / build

| Suite | Result |
|-------|--------|
| `teaching-profile-cap.test.ts` | OK |
| `verification-queue.test.ts` | OK |
| `analytics-conversions.test.ts` | OK |
| `subject-profile-entitlements.test.ts` | OK |
| `public-commercial-consistency.test.ts` | OK |
| `tsc --noEmit` | OK |

---

## O. Files changed (high level)

- Grandfather: `teaching-profile-cap.ts`, `subject-profile-entitlements.ts`, tests  
- Verification: `verification-queue.ts`, admin verifications page, queue item UI, tests  
- Analytics: `analytics-conversions.ts`, `GoogleAnalytics.tsx`, `ConversionBeacon.tsx`, `PageConversion.tsx`, wired into register/contact/ads/receipt/search/listings/verify/past-papers/dashboard/tutor-ads  
- Past papers metadata  
- This report  

---

## P. DB / schema changes

**NONE.** Grandfathering is derived; no Prisma migration.

---

## Q. Production deployment

Push to `main` triggers usual deploy. Verify after deploy:

- `/` `/pricing` `/free-vs-paid` `/help` `/how-it-works` `/search` `/past-papers`  
- Tutor Teaching Profile create blocked at Free=1 with upgrade message  
- Admin verification priority ordering  
- Receipt ConversionBeacon (requires GA id)  

---

## R. Remaining external / legal items

1. Confirm `NEXT_PUBLIC_GA_MEASUREMENT_ID` in Vercel production.  
2. Map GA4 events → Google Ads conversion actions in Ads UI (out of repo).  
3. Request Google recrawl for stale Past Paper / how-it-works snippets.  
4. Lawyer review still separate for safeguarding/minors if expanding claims.  

---

## S. Ready / not-ready for Teaching Profiles Phase 1

**Ready to request approval** for Teaching Profiles Phase 1 **after** you confirm production deploy + GA measurement ID.

**Do not auto-start** Phase 1 / schema / consolidation / wizard redesign / lesson payments / referral system / homepage redesign.

---

## FINAL STATUS

# MTH COMMERCIAL FOUNDATION — CLOSED

Stopped. Awaiting explicit approval before Teaching Profiles Phase 1.
