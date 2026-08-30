# Teaching Profiles — product plan (pre-implementation)

**Status:** PLAN ONLY. Do not implement until the open decisions in §K are answered.  
**Date:** 2026-08-30  
**Repo:** `C:\Tutor`  
**Trigger:** Tutor onboarding wizard step 3 (“What you teach”) on `/dashboard/tutor` is still a bulk subject picker on the **main tutor profile**. The user wants teaching to live only on **separate teaching profiles** (1 subject each), listed and searched independently, with a **new commercial cliff** on 30 September 2026.

**Related docs (do not treat as still-current commercial law without reading this plan):**

- [`docs/MTH-MARKETPLACE-V2-TRACKER.md`](./MTH-MARKETPLACE-V2-TRACKER.md) — **approved live model:** Tutor Free = **3** active Teaching Listings **permanently**; Tutor Pro = **10**.
- [`docs/MTH-MARKETPLACE-V2-FINAL-IMPLEMENTATION-REPORT.md`](./MTH-MARKETPLACE-V2-FINAL-IMPLEMENTATION-REPORT.md) — production verified 2026-08-29 (`b2b978e`).
- [`docs/MTH-MARKETPLACE-V2-COMMERCIAL-AUDIT.md`](./MTH-MARKETPLACE-V2-COMMERCIAL-AUDIT.md) — **stale on listing caps** (still describes the retired “2 free until 30 Sep then 0” model). Code and tracker superseded that.

---

## Vocabulary (use this in the build)

| User language | Current product language | Canonical data |
|---------------|--------------------------|----------------|
| Account / main tutor profile | Master profile / “My profile” | `User` + `TutorProfile` |
| Teaching profile | Teaching Listing | `SubjectProfile` (Prisma model name kept for migration safety) |
| Ads / lists separately | Listing Boost + public listing page | `SubjectProfile` row + optional `AD_BOOST` / `HIGHLIGHTED_AD` windows |
| Student search card | Search result (currently **one per tutor**) | `searchTutors()` → `dedupeSearchByTutor()` |

This plan uses **teaching profile** when describing the target product, and **Teaching Listing / `SubjectProfile`** when describing what already ships.

**Do not invent a second table.** Evolve `SubjectProfile`. Do not create a parallel “TeachingProfile” model unless a later decision proves the current schema cannot carry 1-subject-per-profile + search-per-row.

---

## A. Current state

### A.1 Two layers already exist

**Master profile (`TutorProfile`)** — one per tutor account (`userId` unique). Identity and listability: photo, headline, bio, country/city, `subjects` **CSV blob**, `hourlyRate`, online/in-person, qualifications, verification, `active` / `forceActive`, account-level `planTier`, leftover account-level boost/highlight timestamps.

**Teaching listing (`SubjectProfile`)** — many per master profile. Comment in `prisma/schema.prisma`: *“Teaching Listing (Marketplace V2). Canonical searchable service under one TutorProfile.”* Fields: `subject`, `title`, `headline`, `description`, `level`, `board`, `qualification`, `syllabusCode`, `location`, `country`, `online`, `inPerson`, `rate`, `status` (`ACTIVE` / `PAUSED`), per-row `boostUntil` / `highlightedUntil`. **No unique constraint on subject** (V2 tracker: “unique-on-subject removed”). Duplicate guard is **subject + level + board** (`findDuplicateListing` in `src/app/api/tutor-ads/route.ts`). Distinct levels (e.g. GCSE Maths vs A Level Maths) are **explicitly allowed** (`isNearDuplicateListing` in `src/lib/listing-quality.ts`).

**Legacy `TutorAd`** — deprecated mirror; dual-written on create. Search does **not** query `TutorAd`.

### A.2 Wizard “What you teach” (the screenshot)

File: `src/components/TutorProfileForm.tsx` + `src/lib/tutor-wizard.ts`.

Five steps: Profile photo → About you → Location → **What you teach** → Save profile.

Step 3 currently collects on the **master profile**:

- Bulk **CatalogMultiSelect** “Subjects you teach” (`max={8}`), search + tag cloud + “Add subject”.
- Copy: *“Start with your main subjects. You can add separate listings per subject after saving.”*
- Single **hourly rate** on `TutorProfile.hourlyRate` (screenshot showed EUR `5`; stored as PKR).
- Lesson type (online / in person) and highest qualification (also on this step).

Hint on the step: *“Subjects, hourly rate, and how you teach. Add more subject listings after you save.”*

**This is the bulk-picker the user wants removed.** Copy already hints at separate listings, but the UI still writes a multi-subject CSV onto the master profile.

Completion still **requires** `TutorProfile.subjects` to be non-empty (`isTutorTeachingComplete` in `src/lib/tutor-profile-completion.ts`). Rate on the master can be skipped for listability if `hasValidListingRate` (at least one listing with rate ≥ 500 PKR) — V2 already made listing rate authoritative.

### A.3 Auto-create listing from the blob

`POST /api/profile/tutor` (`src/app/api/profile/tutor/route.ts`): if the tutor has **zero** `SubjectProfile` rows after save, the server **creates one ACTIVE listing** from the **first** CSV subject (or `"General tutoring"`) plus a matching `TutorAd`. So the wizard bulk picker is not only UI — it seeds the first teaching profile.

Dashboard after complete profile: **My teaching listings** (`TutorAdsManager` at `#teaching-listings`) is the real create/edit/pause/boost UI. One form = one listing = one subject (plus level/board). This already matches “create teaching profiles separately” **after** the wizard.

### A.4 Ads / listing separately (already mostly true)

- Public URL: `/listings/{subjectProfileId}` via `listingPath()` (`src/lib/subject-profile.ts`).
- Dashboard: each listing has View / Pause / Activate / Edit + **Listing Boost** (`SubscribeButton` `plan="AD_BOOST"` with `subjectProfileId`). Checkout binds Boost/Highlight to one listing via `subscription.notes` (`src/lib/listing-checkout.ts` → `applyVisibilityToSubjectProfile`).
- `ProfileBoostPanel` is a pointer: “Open Profile tab, pick a teaching listing, then boost that row.” It does **not** boost the whole account as a new SKU.
- Boost price (code default, admin may override): `AD_BOOST` **PKR 999** one-time, 30 days (`src/lib/plans.ts`). Legacy `HIGHLIGHTED_AD` **PKR 1,299**.

Gap vs user intent: Boost is per listing; **search still collapses listings to one card per tutor**, so a boosted Physics listing can be hidden behind a higher-scoring History listing for the same person (“Also teaches”).

### A.5 Search unit vs search display (the conflict)

**Query unit is already the listing.** `searchTutors()` (`src/lib/search-tutors.ts`) loads `SubjectProfile` where `status: "ACTIVE"` and parent tutor is publicly listable. Cards use listing `subject`, `title`, `rate`, taxonomy; identity (photo, name, reviews, verified) comes from the parent `TutorProfile`. Search result links go to `/listings/{id}`, not `/tutors/{id}`.

**Display unit is one tutor.** After scoring, results pass through `dedupeSearchByTutor()` (`src/lib/search-dedupe.ts`):

> Marketplace V2: one tutor per result set, using the highest-scoring listing. Remaining eligible listings become “Also teaches…”.

Tests (`src/lib/search-dedupe.test.ts`) assert two listings for tutor `t1` become **one** card (`l2` wins) plus `alsoTeaches: [l1]`. Search UI (`src/app/search/page.tsx`) renders “Also teaches:” links to the other listing URLs.

**User requirement (“each teaching profile appears separately”) directly contradicts this V2 search product.** Shipping it means undoing or gating that dedupe. Same tutor can appear twice (or three times) on one results page.

Other one-tutor collapsing (must be reviewed in the same change):

- Homepage featured/hero helpers in `src/lib/featured-tutors.ts` (`dedupeFeaturedListingsByTutor`) — homepage featured rail was later removed (`7a0e0d0`); helper may still be unused or used elsewhere.
- `similarTutors()` already returns **listings** and excludes the whole parent tutor (`excludeTutorProfileId`), so similar-rail will not show the same tutor’s other subjects. If search stops deduping, similar-rail policy should be an explicit choice.

Pagination today counts **deduped tutors** (`PAGE_SIZE = 12`). Undoing dedupe increases result counts and can fill a page with one tutor’s subjects.

### A.6 Entitlements and prices (live V2 — canonical)

Source of truth: `src/lib/subject-profile-entitlements.ts` + `BUSINESS` in `src/lib/business-rules.ts`.

| Constant | Value | Meaning |
|----------|-------|---------|
| `FREE_SUBJECT_PROFILES` | **3** | Tutor Free active listing cap |
| `TUTOR_PRO_SUBJECT_PROFILE_CAP` | **10** | Tutor Pro (`TUTOR_BASIC`) and grandfathered `EXTRA_PROFILE_ADS` |
| `BUSINESS.tutorFreeActiveListings` | 3 | Marketing consumes this |
| `BUSINESS.tutorProActiveListings` | 10 | Marketing consumes this |
| `isSubjectProfilePromoActive()` | **always `false`** | Promo window **retired** in V2 |
| `SUBJECT_PROFILE_PROMO_UNTIL` | `"2026-09-30"` | **Dead constant** kept for email/compat; not used for caps |
| `FREE_SUBJECT_PROFILES_AFTER_PROMO` | 3 | Deprecated alias of free cap |

`resolveSubjectProfileActiveCap`: Unlimited (`UNLIMITED_ADS`) → ∞; Tutor Pro or Extra Profile Ads → 10; else → **3**. No date branch.

Over-cap: `enforceSubjectProfileCap` pauses oldest-updated ACTIVE listings and pauses matching `TutorAd` rows. Called from `syncTutorBadges` and digest cron (`/api/digests/onboarding`).

**Public copy** (`TUTOR_FREE_LISTING_LINE` in `src/lib/marketing-copy.ts`): complete profile lists free; **up to 3** active teaching listings; Tutor Pro **up to 10**. Homepage, become-a-tutor, help, terms, emails, free-vs-paid all aligned to 3/10 after V2 cutover.

**Existing products and list prices** (`DEFAULT_PLANS` in `src/lib/plans.ts` — PKR monthly unless noted; admin `SiteSettings` may override):

| Plan ID | Public name | Sold on `/pricing`? | List price | Listing entitlement |
|---------|-------------|---------------------|------------|---------------------|
| `TUTOR_BASIC` | **Tutor Pro** | Yes | **1,499**/mo (annual ≈ 9.6×); **promo 0 until 2026-09-30** | Up to **10** listings + ranking + unlimited enquiry reveals |
| `AD_BOOST` | Listing Boost | Yes (add-on) | **999** one-time / 30 days / **one listing** | Does **not** raise listing cap |
| `HIGHLIGHTED_AD` | Listing Highlight (legacy) | Hidden as primary | **1,299** | Does not raise cap |
| `EXTRA_PROFILE_ADS` | Extra Profile Ads (legacy) | **No** (grandfather) | **999** | Maps to **Pro cap (10)** + unlimited reveals |
| `UNLIMITED_ADS` | Unlimited Profiles (legacy) | **No** (grandfather) | **1,999** | Unlimited listings |
| `VERIFIED_TUTOR` | Priority Verification Review | Yes | **2,999** | Queue only; **not** a listing SKU |

There is **no live SKU** whose job is “buy listing #2” or “buy one extra teaching profile on Free.” Extra listings on Free are sold by **upgrading to Tutor Pro (10)**. Boost is visibility, not capacity.

**Separate 30 Sep 2026 promo (must not be confused with listing caps):** Tutor Pro itself is **complimentary until 30 September 2026** (`promoUntil: "2026-09-30"`, UTC end of day via `endOfPromoDay`). V2 **intentionally** kept that growth-tools promo while making the **3 free listings permanent**. A new listing cliff on the **same calendar day** will collide with Tutor Pro going from PKR 0 → PKR 1,499 unless messaging is designed together.

### A.7 Messaging / contacts (identity is the account)

`Conversation` is unique on `(userAId, userBId)` — **one thread per student–tutor pair**, not per listing. `relatedAdId` is stored on **create only** (listing id stuffed into a field named for legacy ads). A second message from another teaching profile **does not** open a new conversation and **does not** consume a second student contact.

Student free contacts: **3 new tutors / month** (`BUSINESS.studentFreeContactsPerMonth`), counted per **tutor user**, not per listing.

Inbox cannot natively show “this thread is about Physics vs History” except via the first `relatedAdId` and whatever the student typed.

### A.8 SEO / public URLs (already listing-first)

- `/listings/{id}` — subject listing page; sitemap includes ACTIVE public listings (priority 0.75).
- `/tutors/{id}` — person hub (all listings, reviews, message picker). If the tutor has **exactly one** ACTIVE listing, canonical is the listing URL (so the hub does not compete).
- Search cards already deep-link to listings.
- Do **not** delete `SubjectProfile` ids; they are indexed and shared.

---

## B. Target product model

```
Account (User)
  └── 1× TutorProfile          ← identity only (photo, name, bio, place, verification, quals)
        └── N× teaching profiles (SubjectProfile)
              └── 1 subject each
              └── own rate, level/board/code, copy, status, Boost
              └── own /listings/{id}
              └── own search card  ← NEW vs V2 display
```

1. **Do not add subjects on the main tutor profile.** Master `subjects` CSV is not a picker; at most a **derived cache** of listing subjects (see §G).
2. **Tutors create teaching profiles separately** — dedicated create/manage UI (today: `TutorAdsManager`; wizard must stop pretending the bulk picker is “what you teach”).
3. **1 teaching profile = 1 subject** — tighten vs today if the user confirms “subject” means catalog subject (Maths once) rather than subject+level (GCSE Maths and A Level Maths as two profiles). See §K.
4. **Caps (proposed — not live):** 3 active teaching profiles **free until 30 September 2026**; from 1 October 2026, **1** free; additional profiles **paid**.
5. **Each profile ads/lists separately** — keep per-listing Boost; search card must be the listing (so Boost on listing B can actually surface B).
6. **Each profile appears separately in student search** — remove or replace `dedupeSearchByTutor` for the main search path.

Master profile remains the **trust and messaging identity**. Students still message a person; listings are the **catalog SKUs**.

Listability proposed change: eligible to appear when email-verified + identity complete **and ≥1 ACTIVE teaching profile** with a valid listing rate — **not** when a CSV of subjects exists on the master. Master hourly rate should stop being a wizard requirement (already optional when a listing rate exists).

---

## C. Wizard / UX

### C.1 Remove subject picking from the main profile

On wizard step “What you teach” (or replace the step):

- **Remove** `CatalogMultiSelect` bulk subject tags and “Add subject” on `TutorProfile`.
- **Do not** keep a “pick 8 subjects then we split them later” flow.
- **Stop** auto-creating a listing from `profile.subjects.split(",")[0]` on first profile save (or replace it with an explicit “create your first teaching profile” step so the tutor chooses **one** subject, rate, level).

Keep on the **account** (this step or adjacent): lesson mode (online / in person) as **defaults** that new teaching profiles inherit; highest qualification (identity/trust, not a subject). Optional: drop master hourly rate from the wizard entirely and require rate on the first teaching profile.

Wizard resume (`resolveTutorWizardResumeStep`) currently blocks on `profile.subjects` and master `hourlyRate`. It must resume on **“no teaching profile yet”** instead.

Completion / status card (`tutor-profile-completion`, `tutor-profile-status`, dashboard percent) must treat **first teaching profile** as the teaching gate, not the CSV.

### C.2 Where tutors create and manage teaching profiles

**Keep** `/dashboard/tutor?tab=profile#teaching-listings` (`TutorAdsManager`) as the manager: create one, edit, pause, activate, Boost, quality tips, cap meter.

**Add** a first-run path so a new tutor is not told “save the master profile, then scroll down”:

- **Recommended:** after identity steps, a **Create your first teaching profile** step (single subject + rate + level/board) that `POST`s `/api/tutor-ads` (or equivalent). Save profile does **not** invent a “General tutoring” listing.
- Empty state copy: you are not in search for a subject until you publish a teaching profile.
- Cap meter copy must follow the **approved** commercial decision (today it still says Free 3 / Pro 10 via `subjectProfilePromoLabel()`).

Do not require a second account or a second `TutorProfile` per subject.

### C.3 Ads per profile

Keep: Boost/Highlight checkout already takes `subjectProfileId`.  
Change: search display must not hide a boosted listing behind another subject’s card.  
Copy: say “Boost this teaching profile” if the product rename ships; SKU remains **Listing Boost** (`AD_BOOST`) — do not invent a new public add-on name.

Pause listing ⇒ hidden from search; Boost windows stay on the row.

### C.4 Surfaces that still talk like the bulk picker

Must be rewritten in the same UX phase: wizard hints, dashboard hero (“Finish a short profile… then add subject listings”), finish-step “scroll to My teaching listings”, nurture email *“Start by adding the subjects you teach”* (`src/lib/email.ts`), `max={8}` mental model, become-a-tutor if it still implies one mega-profile.

---

## D. Search: one card per teaching profile

### D.1 Required change

Stop collapsing `searchTutors()` results with `dedupeSearchByTutor` (or make it a no-op / opt-in). Each ACTIVE `SubjectProfile` that matches filters is its **own** card: subject, listing title, listing rate, listing Boost, same tutor photo/name/verified/reviews.

Remove or demote the “Also teaches” chip row (or keep it as a *secondary* cross-link **on the listing page**, not as a substitute for a missing card).

Update: `src/lib/search-tutors.ts`, `src/lib/search-dedupe.ts` (+ tests), `src/app/search/page.tsx`, search analytics (`listingIds` already supports many ids), any “unique tutors via message targets” assumptions from the V2 verification report.

### D.2 Student-facing implications (same tutor twice)

| Topic | Today | After undoing dedupe |
|-------|--------|----------------------|
| Results page | One card; other subjects in “Also teaches” | History, Physics, Korean = **three cards**, same face/name |
| Pagination | 12 **tutors** | 12 **listings** — fewer unique people per page |
| Rank / Boost | Boost on listing B can lose to listing A’s score, then B is buried in Also teaches | Boost on B can rank B’s **own** card |
| Broad query (“tutor Rawalpindi”) | Diverse people | Risk of **one prolific tutor occupying many slots** |
| Subject-filtered search (“Korean”) | Usually one card anyway | Little change if they have one Korean profile |
| Contacts | 3 **tutors**/month | Messaging from card 2 of the same person **does not** use another contact (same conversation) |
| Saved / recents | Can store `listingId` | Multiple saves of the same person possible — UX should show subject |

**Product risks to accept or mitigate (see §I):** visual spam; student confusion (“is this a different Mark?”); ranking fairness; similar-rail already hiding sibling listings.

**Mitigations to decide in implementation (not to invent now):** cap listings per tutor per **unfiltered** page (e.g. max 2) while showing all matches on **subject-filtered** search; small “Same tutor” affordance; sort still relevance-first so three weak extra subjects do not outrank a better specialist.

**Do not** keep V2 dedupe if the user confirmed separate cards. Half-shipping (“Also teaches” plus a second card) is the worst of both.

---

## E. Commercial — **this is a policy change**

### E.1 Live V2 vs this proposal

| | **Live Marketplace V2 (approved 2026-08-29, in production)** | **This proposal** |
|--|--------------------------------------------------------------|-------------------|
| Tutor Free active teaching profiles | **3, permanent** | **3 until 30 Sep 2026**, then **1** |
| After 30 Sep 2026 (Free) | Still 3 | 1 free; extras paid |
| Earlier retired idea | “2 free until 30 Sep then **0**” — **removed** as the permanent model | **Not** a return to zero; new cliff to **one** free |
| Tutor Pro listings | **10** | **OPEN** — see §K |
| Same calendar date | Tutor Pro complimentary → paid (PKR 1,499/mo) | Listing free allotment also cliffs |

**Flag: commercial policy change.** Do not silently re-enable `isSubjectProfilePromoActive()`. V2 set it to always false on purpose. Shipping 3→1 requires a **new** explicit approval, then code + every marketing string that currently says “up to 3”.

Code still contains fossils of the old 2→0 promo (`SUBJECT_PROFILE_PROMO_UNTIL`, deprecated aliases). Those must be **rewritten**, not blindly revived — the numbers and the post-promo floor are different (1, not 0).

### E.2 How to sell extras using **existing** products (do not invent names)

**Do not invent a new public product** unless §K rejects mapping to Tutor Pro.

| Need | Existing SKU | What code actually grants | Fit? |
|------|--------------|---------------------------|------|
| Extra teaching profiles after Free cap | **Tutor Pro** (`TUTOR_BASIC`) | Cap **10** | Fits “pay for extras” if Pro still means 10 |
| À-la-carte +1 listing | **None** | — | **OPEN DECISION** — no price, no SKU |
| Legacy “extra listings” pack | `EXTRA_PROFILE_ADS` | Grandfather → **10** (Pro-equivalent), **not sold** on Pricing | Do not put back on `/pricing` without a naming decision |
| Unlimited listings | `UNLIMITED_ADS` | ∞, **not sold** | Keep grandfather only |
| Promote one profile in search | **Listing Boost** (`AD_BOOST`) | 30-day rank bump on **one** listing; **does not** add cap | Keep for “ads separately”; **not** a substitute for a 2nd profile slot |

### E.3 Prices — cite only what exists; do not invent

From `src/lib/plans.ts` `DEFAULT_PLANS` (live checkout may differ via admin overrides):

- Tutor Pro: **PKR 1,499 / month** (promo **PKR 0** until **2026-09-30** inclusive UTC).
- Listing Boost: **PKR 999** one-time.
- Extra Profile Ads (legacy, not publicly sold): **PKR 999**.
- Unlimited Profiles (legacy, not publicly sold): **PKR 1,999**.

**OPEN DECISION — price of “extra teaching profile after 30 Sep”:** not defined as a Free-plan add-on. If extras = Tutor Pro, the price is Tutor Pro’s list (1,499/mo after promo), which buys **up to 10**, not “+1”. If the business wants “1 free + PKR X per extra profile”, **X is not in BUSINESS or DEFAULT_PLANS**.

`BUSINESS` has no money amounts — only counts (`tutorFreeActiveListings`, `tutorProActiveListings`) and commission/contact flags.

---

## F. Entitlements timeline

Assume UTC end of **2026-09-30** (same helper as Tutor Pro: `endOfPromoDay("2026-09-30")` → `2026-09-30T23:59:59.999Z`), unless legal wants a PK timezone. **Confirm in §K.**

### F.1 Before / on 30 September 2026 (proposed)

| Tutor | Active teaching-profile cap |
|-------|-----------------------------|
| Free (no Tutor Pro / Extra / Unlimited) | **3** |
| Tutor Pro (`TUTOR_BASIC`) | **10** (unless §K changes Pro) |
| Grandfather `EXTRA_PROFILE_ADS` | **10** (current mapping) |
| Grandfather `UNLIMITED_ADS` | Unlimited |

Behaviour matches **live V2 numbers** during this window; only the **expiry** is new.

### F.2 From 1 October 2026 (proposed)

| Tutor | Cap |
|-------|-----|
| Free | **1** |
| Tutor Pro | **10** (OPEN if Pro’s meaning changes) |
| Extra Profile Ads holders | Keep 10 while subscription active (current code) |
| Unlimited holders | Keep ∞ |

`enforceSubjectProfileCap` already pauses surplus by **most recently updated** kept. A 3→1 drop on Free would pause **two** listings per tutor who still has three ACTIVE rows, unless grandfathered.

### F.3 Tutors who already have 3 listings (must decide before cron fires)

Live production snapshot at V2 verification (2026-08-29): **103** `SubjectProfile` rows, **74** ACTIVE, **16** tutors with ≥1 ACTIVE listing. Some Free tutors may already sit on 3.

Options (pick one in §K):

1. **Hard cliff** — 1 Oct job pauses down to cap 1 (current `enforceSubjectProfileCap` behaviour). Harsh; email required.
2. **Grandfather active set** — tutors who had 3 ACTIVE on 30 Sep keep 3 until they pause/delete; **new** Free creates blocked at 1. Needs a flag or snapshot date.
3. **Soft warning window** — notify in September; enforce 1 Oct.
4. **Complimentary Tutor Pro** already covers many through 30 Sep — on 1 Oct they **also** lose Pro unless they start paying 1,499/mo, which would **keep 10**. Free tutors who never activated complimentary Pro fall to 1.

Option 4 is a **messaging minefield**: same date, two different cliffs (Pro price and Free listing count).

### F.4 Implementation sketch (after approval only)

Reintroduce a **dated** branch in `resolveSubjectProfileActiveCap`:

- `now <= promoEnd` → freeCap = 3  
- `now > promoEnd` → freeCap = 1  
- Paid paths unchanged unless §K says otherwise  

Set `isSubjectProfilePromoActive` to a **real** date check again, with **new** copy (not the deprecated “V2 has no promo sunset” comments). Update tests that currently assert promo always false and free cap always 3. Update `subjectProfilePromoLabel`, API entitlement payload (`promoActive`, `freeCapAfterPromo`), dashboard meter, emails, `TUTOR_FREE_LISTING_LINE`, homepage `{BUSINESS.tutorFreeActiveListings}` (BUSINESS cannot stay a single integer if the cap is time-dependent — either split constants or make helpers date-aware).

---

## G. Data migration (`TutorProfile.subjects` vs `SubjectProfile`)

### G.1 What exists

- `TutorProfile.subjects`: comma-separated blob; wizard writes up to 8 labels; completion requires it; some emails/search fallbacks still read it.
- `SubjectProfile`: real catalog rows; search already prefers `listing.subject`.
- First profile save with zero listings **materializes only the first** CSV subject. Extra tags on the master **do not** become listings until the tutor uses `TutorAdsManager`.
- Seed/admin paths also backfill one listing when none exist (`src/lib/seed-company.ts`).

### G.2 Target

- **Source of truth:** `SubjectProfile.subject` (one per teaching profile).
- Master `subjects`: optional **derived** denormalise (join of ACTIVE listing subjects) for old queries, AI bio, request matching — **or** stop writing it from the wizard and only sync from listings.
- No new table. Do not drop `subjects` column in the first phase (Prisma + many readers).

### G.3 Migration steps (when implementation is approved)

1. Inventory: tutors with CSV subjects but 0 listings; CSV subjects not represented as listings; listings whose subject is missing from the CSV; `"General tutoring"` auto-creates.
2. For tutors with listings: rewrite `TutorProfile.subjects` from distinct ACTIVE listing subjects (display/search fallback only).
3. For tutors with CSV only: **do not** silently explode 8 tags into 8 listings (would blow caps and spam search). Prompt in dashboard: “Turn each subject into a teaching profile” with cap awareness — or create **one** listing from the first subject only (today’s behaviour) and show the rest as suggestions.
4. Stop creating `"General tutoring"` listings.
5. If §K chooses strict 1-subject-per-tutor: merge or pause duplicate-subject rows (keep the higher-quality / more recently updated; 301 is N/A — listings are id URLs). Distinct level of the **same** catalog subject may need merge vs keep — depends on §K.
6. Dual-write `TutorAd` can remain until a later cleanup; not required for search.

**Do not delete listing rows** to “clean” the blob. Pause, don’t destroy, when enforcing caps.

---

## H. SEO

| URL | Policy |
|-----|--------|
| `/listings/{id}` | **Keep forever** for existing ids. Search, sitemap, shares, analytics. Paused listings: noindex (already). |
| `/tutors/{id}` | Keep as person hub. Canonical to sole listing only when exactly one ACTIVE teaching profile. If one tutor has three search cards, the hub still aggregates identity + all lessons. |
| `/s/{subject}` and city hubs | Continue to list **listings**, not one mega-profile. |
| Sitemap | Keep listing + tutor routes. More search cards ≠ new URL scheme. |

**No orphaning:** cap enforcement must `PAUSED` not `delete`. Redirects only if a future merge duplicates two listings — default is keep both URLs, pause one.

JSON-LD on listing pages already describes the subject service; person schema stays on the hub. After undoing dedupe, avoid duplicate `sameAs` spam; listing pages can `mentions` the person hub.

---

## I. Risks

1. **Same tutor, multiple search cards** — students may think they are different people, or feel spammed. Mitigate with consistent photo/name and optional “Same tutor” label. Product accepted this if they want per-profile ads to work.
2. **Fairness / monopoly of page-1** — a Free tutor with 3 profiles (before cliff) or Pro with 10 can occupy many slots on generic queries. Subject-filtered search is the healthy case.
3. **Grandfathering vs hard pause on 1 Oct** — pausing two of three live listings without email is a trust incident. Complimentary Tutor Pro ending the same day compounds it.
4. **Messaging which profile** — one inbox thread per pair; `relatedAdId` only on first message. Tutors may not see which subject the student meant. Listing page should pre-fill message body / keep picker; consider showing listing title in the first system line. **Do not** split conversations per listing without a separate product decision (unique constraint would break).
5. **Student contact fairness** — contacting the same tutor from two cards still counts as **one** contact. That is probably correct; document it so students are not afraid to open the “other” card.
6. **Completion deadlock** — if subjects are removed from the wizard before listability accepts “has teaching profile”, tutors can never go live.
7. **Strict 1-subject vs GCSE/A-Level** — forcing one Maths row would regress V2 “create one listing per subject or level” copy on the dashboard.
8. **Copy drift** — `BUSINESS.tutorFreeActiveListings = 3` is hardcoded into homepage. Time-varying caps will desync if only entitlements.ts changes.
9. **Boost vs relevance** — V2 reweighted scores so Boost cannot bury subject fit. Separate cards make Boost more powerful **within** a subject; still must not let Boosted Chemistry outrank a better Chemistry match. Keep current score weights.
10. **Legal / advertised 3-permanent** — public site currently promises 3 free listings with no sunset. Changing to a Sep 30 cliff needs terms, help, become-a-tutor, and possibly tutors who signed up on the V2 promise.

---

## J. Implementation phases (**do not start**)

Gate: §K answers recorded (even a short addendum in this file).

| Phase | Work | Depends on |
|-------|------|------------|
| **0. Commercial lock** | Write approved caps, Pro meaning, extra-profile SKU/price, grandfather rule, timezone into this doc + tracker. Do not code. | User |
| **1. Entitlements + copy** | Date-aware free cap 3→1; tests; `BUSINESS`/marketing-copy/emails/pricing/free-vs-paid/help/terms. Restore promo helper with **new** semantics. | Phase 0 |
| **2. Wizard / completion** | Remove bulk picker; first teaching-profile step; stop blob auto-create; completion via listings; resume step; dashboard empty states. | Can start UX after 0 even if copy pending |
| **3. 1-subject rule** | If approved: unique subject per tutor (case-insensitive); migrate duplicates; adjust near-dup logic. | Phase 0 (definition of “subject”) |
| **4. Search display** | Remove/replace `dedupeSearchByTutor` on main search; tests; search page “Also teaches”; pagination; analytics. Review similar-rail and any leftover featured dedupe. | Product accept of multi-card |
| **5. Data backfill** | Derive CSV from listings; no silent 8-way explode; kill “General tutoring” seed. | Phase 2 |
| **6. Messaging UX** | Pre-fill subject on listing CTA; show listing context in thread if cheap. No schema split unless separately approved. | Phase 4 nice-to-have |
| **7. Cliff ops** | September emails; 1 Oct dry-run of `enforceAllSubjectProfileCaps`; admin report of Free tutors with >1 ACTIVE listing. | Phase 1 + grandfather choice |
| **8. Verify** | Browser: wizard without bulk picker; create 2–3 profiles; search shows N cards; Boost on profile 2; `/listings/{id}` 200; pause hides card; cap meter; Pro still 10 if approved. | All above |

**Out of scope until asked:** new public SKU name, lesson escrow, splitting `Conversation` unique key, deleting `TutorAd`, renaming Prisma `SubjectProfile`.

---

## K. Open questions for the user

**Do not build until these are answered.** Highest-leverage first:

1. **Confirm the cliff vs live V2.** Replace “3 teaching listings always free” with **3 free until 30 September 2026, then 1 free + pay for extras**? This **reopens** a sunset that V2 **removed**. Same date as Tutor Pro leaving PKR 0.
2. **Price of extra profiles after 30 Sep.** There is **no** à-la-carte SKU. Map extras to **Tutor Pro (PKR 1,499/mo after promo, up to 10 listings)**? Or define a new price (**OPEN — do not invent**)? Do **not** resell Extra Profile Ads on `/pricing` without explicitly resurrecting that name.
3. **Does Tutor Pro still mean 10 listings?** After the cliff, is Pro still “up to 10”, or only “paid extras” with a different cap?
4. **Grandfather tutors who already have 3 ACTIVE listings** on 1 Oct 2026: keep 3, or pause down to 1 (current enforcer), or keep 3 only if they were live before the cliff?
5. **1 teaching profile = 1 subject — how strict?** Today GCSE Maths and A Level Maths are two valid listings. Forbidden (one Maths profile with levels inside) or still allowed (level/board differentiate)?
6. **Search: truly one card per teaching profile with no per-tutor cap**, including generic (no subject) queries where one person could take several of 12 slots?
7. **Student contacts:** keep counting **unique tutors** (recommended; matches current `Conversation` uniqueness), or count per listing (would require a product + schema change)?
8. **Timezone for “30 September 2026”:** UTC end-of-day (code default) or Pakistan time?
9. **Public rename:** keep “Teaching listings” in UI, or switch to “Teaching profiles”? SKUs stay Tutor Pro / Listing Boost.

---

## Appendix — files that will change after approval (inventory only)

| Area | Files |
|------|--------|
| Caps | `src/lib/subject-profile-entitlements.ts` (+ tests), `src/lib/business-rules.ts`, `src/lib/subscription.ts` |
| Wizard | `src/components/TutorProfileForm.tsx`, `src/lib/tutor-wizard.ts`, `src/lib/tutor-profile-completion.ts`, `src/app/api/profile/tutor/route.ts` |
| Manager / ads | `src/components/TutorAdsManager.tsx`, `src/app/api/tutor-ads/route.ts`, `src/app/dashboard/tutor/page.tsx` |
| Search | `src/lib/search-tutors.ts`, `src/lib/search-dedupe.ts` (+ tests), `src/app/search/page.tsx` |
| Copy | `src/lib/marketing-copy.ts`, `src/lib/plans.ts`, `src/lib/free-vs-paid.ts`, `src/lib/email.ts`, become-a-tutor / help / terms / homepage |
| SEO | `src/app/listings/[id]/page.tsx`, `src/app/tutors/[id]/page.tsx`, `src/app/sitemap.ts` (likely untouched if ids stay) |

---

## Decision log

| Date | Decision | Source |
|------|----------|--------|
| 2026-08-29 | V2: Free **3** permanent, Pro **10**; retire 2→0 promo | Tracker + final implementation report |
| 2026-08-30 | **Proposal (unapproved):** Free **3 until 30 Sep 2026**, then **1** + paid extras; no subjects on master profile; 1 profile = 1 subject; search **not** deduped by tutor | This plan — awaiting §K |
