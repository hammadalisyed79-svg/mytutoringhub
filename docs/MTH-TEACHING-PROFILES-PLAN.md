# Teaching Profiles — product plan

**Status:** PRODUCT MODEL LOCKED. **PHASE 1 COMPLETE** (2026-08-30). **PHASE 2 COMPLETE** (2026-08-30) — wizard / completion / listability. Schema + join table + ACTIVE-only unique-index SQL + read-only preview are in the repo. **Unique index SQL is still NOT applied** (7 live ACTIVE collisions). Do not change search-dedupe, entitlements 3/10, Boost SKU, messaging, or production listing rows.  
**Date:** 2026-08-30  
**Repo:** `C:\Tutor`  
**Preview:** [`docs/MTH-TEACHING-PROFILES-PHASE1-PREVIEW.md`](./MTH-TEACHING-PROFILES-PHASE1-PREVIEW.md)

**Trigger:** Tutor onboarding wizard step 3 (“What you teach”) on `/dashboard/tutor` is still a bulk subject picker on the **main tutor profile**. Approved direction: teaching lives only on **subject-based Teaching Profiles** (one canonical subject each, with multi-value board/level/qualification/syllabus capabilities inside that profile). Listed and searched as Teaching Profiles. **Commercial caps stay Marketplace V2** (Free 3 / Pro 10, permanent).

**Related docs (do not treat as still-current commercial law without reading this plan):**

- [`docs/MTH-MARKETPLACE-V2-TRACKER.md`](./MTH-MARKETPLACE-V2-TRACKER.md) — **approved live model, KEPT:** Tutor Free = **3** active Teaching Profiles **permanently**; Tutor Pro = **10**.
- [`docs/MTH-MARKETPLACE-V2-FINAL-IMPLEMENTATION-REPORT.md`](./MTH-MARKETPLACE-V2-FINAL-IMPLEMENTATION-REPORT.md) — production verified 2026-08-29 (`b2b978e`).
- [`docs/MTH-MARKETPLACE-V2-COMMERCIAL-AUDIT.md`](./MTH-MARKETPLACE-V2-COMMERCIAL-AUDIT.md) — **stale on listing caps** (still describes the retired “2 free until 30 Sep then 0” model). Code and tracker superseded that. **Do not revive that cliff, and do not invent a new 3→1 Oct 2026 cliff.**

---

## Vocabulary (use this in the build)

| User language | Current product language | Canonical data |
|---------------|--------------------------|----------------|
| Account / main tutor profile | Master profile / “My profile” | `User` + `TutorProfile` |
| **Teaching Profile** | Teaching Listing | `SubjectProfile` (Prisma model name **kept**; do not rename) |
| Ads / lists separately | Listing Boost + public listing page | `SubjectProfile` row + optional `AD_BOOST` / `HIGHLIGHTED_AD` windows |
| Student search card | Search result (today **one per tutor**) | `searchTutors()` → `dedupeSearchByTutor()` — **target: one card per matching Teaching Profile**, with broad-search max 2 per `TutorProfile` per page |

This plan uses **Teaching Profile** in product copy. Internals may still say Teaching Listing / `SubjectProfile`. Public URLs stay `/listings/{id}`.

**Do not invent a second table.** Evolve `SubjectProfile`. Do not create a parallel `TeachingProfile` Prisma model unless Phase 1 proves the current model cannot carry one-canonical-subject-per-row plus multi-value capabilities.

---

## Locked product model

```
Account (User)
  └── 1× TutorProfile                    ← person only (photo, name, bio, place, quals, verification, reviews)
        └── N× Teaching Profiles (SubjectProfile)
              └── 1 CANONICAL SUBJECT each
              └── multi-value capabilities: levels, boards/curricula, qualifications, syllabus codes
              └── own rate, copy, status, Boost, listing quality
              └── own /listings/{id}
              └── own search card when it matches (broad search: max 2 cards per TutorProfile per page)
```

**ONE tutor account → ONE master `TutorProfile` → MULTIPLE Teaching Profiles → EACH Teaching Profile = ONE canonical subject.**

Replace any earlier interpretation that a Teaching Profile may be split by subject+board, subject+level, subject+qualification, or subject+syllabus code.

### Examples (allowed)

Ahmed Khan:

- Mathematics
- Physics
- Chemistry

### Examples (not allowed)

- Mathematics — GCSE
- Mathematics — A Level
- Mathematics — IB
- Mathematics — Cambridge
- Mathematics — Edexcel

Those differences are **capabilities inside** the single Mathematics Teaching Profile, not extra profiles.

**Uniqueness (active):** `TutorProfile` + **canonical subject** = at most one ACTIVE Teaching Profile.

**Do not** solve GCSE / A Level / Cambridge / Edexcel by creating extra Mathematics rows. Edit the existing Mathematics profile and add capabilities.

Current V2 duplicate logic (`subject + level + board` in `findDuplicateListing`; distinct levels explicitly allowed in `isNearDuplicateListing`) is **no longer the target model**.

---

## A. Current state (what ships today — evidence, not target)

### A.1 Two layers already exist

**Master profile (`TutorProfile`)** — one per tutor account (`userId` unique). Identity: photo, headline, bio, country/city, `subjects` **CSV blob**, `hourlyRate`, `online` / `inPerson`, `qualifications`, `levels` (also CSV), verification, `active` / `forceActive`, account-level `planTier`, leftover account-level boost/highlight timestamps.

**Teaching listing (`SubjectProfile`)** — many per master profile. Comment in `prisma/schema.prisma`: *“Teaching Listing (Marketplace V2). Canonical searchable service under one TutorProfile.”*

Scalar fields today (all **singular**): `subject`, `title`, `headline`, `description`, `level` (default `"All levels"`), `board`, `qualification`, `syllabusCode`, `location`, `country`, `online`, `inPerson`, `rate`, `status` (`ACTIVE` / `PAUSED`), per-row `boostUntil` / `highlightedUntil`.

**No unique constraint on subject.** V2 tracker: “unique-on-subject removed”. Duplicate guard is **subject + level + board** (`findDuplicateListing` in `src/app/api/tutor-ads/route.ts`). Distinct levels (e.g. GCSE Maths vs A Level Maths) are **explicitly allowed** (`isNearDuplicateListing` in `src/lib/listing-quality.ts`, reason `distinct_levels_ok` / `distinct_boards_ok`).

Indexes used by search: `@@index([status, subject])`, `@@index([tutorProfileId, status])`, `@@index([board, subject])`, `@@index([syllabusCode])`.

**Legacy `TutorAd`** — deprecated mirror; dual-written on create. Search does **not** query `TutorAd`.

**`Subject` Prisma model** exists (`name` / `slug` unique) and is related only to `PastPaper`. **`SubjectProfile.subject` is an unlinked free-form `String`.** There is no FK and no join table for boards/levels/codes on a listing.

The whole Prisma schema has **no `Json` columns and no array (`String[]`) columns.** Multi-value data on the master profile is CSV strings (`subjects`, `levels`, `languages`).

### A.2 Wizard “What you teach” (the screenshot)

File: `src/components/TutorProfileForm.tsx` + `src/lib/tutor-wizard.ts`.

Five steps today: Profile photo → About you → Location → **What you teach** → Save profile.

Step 3 currently collects on the **master profile**:

- Bulk **CatalogMultiSelect** “Subjects you teach” (`max={8}`).
- Copy: *“Start with your main subjects. You can add separate listings per subject after saving.”*
- Single **hourly rate** on `TutorProfile.hourlyRate`.
- Lesson type and highest qualification (also on this step).

**This bulk picker is removed in the target wizard.** Completion still **requires** `TutorProfile.subjects` non-empty (`isTutorTeachingComplete` in `src/lib/tutor-profile-completion.ts`). Rate on the master can be skipped for listability if `hasValidListingRate` (listing rate ≥ 500 PKR).

### A.3 Auto-create listing from the blob

`POST /api/profile/tutor` (`src/app/api/profile/tutor/route.ts`): if the tutor has **zero** `SubjectProfile` rows after save, the server **creates one ACTIVE listing** from `profile.subjects.split(",")[0]` **or `"General tutoring"`**, plus a matching `TutorAd`. Seed path (`src/lib/seed-company.ts`) can also invent `"General tutoring"`.

**Target: stop both.** The tutor must explicitly create the first Teaching Profile. Do not explode remaining CSV tags into extra profiles.

Dashboard after complete profile: **My teaching listings** (`TutorAdsManager` at `#teaching-listings`) is the real create/edit/pause/boost UI — one form = one row = one subject **plus singular level/board**. Manager stays; form must become multi-value capabilities; public name becomes **My Teaching Profiles**.

### A.4 Ads / listing separately (already mostly true)

- Public URL: `/listings/{subjectProfileId}` via `listingPath()` (`src/lib/subject-profile.ts`). **Keep.**
- Boost/Highlight checkout already binds to one `subjectProfileId` (`src/lib/listing-checkout.ts` → `applyVisibilityToSubjectProfile`). **Keep.** Boost does **not** raise cap.
- Boost price (code default): `AD_BOOST` **PKR 999** one-time, 30 days. Copy target: “Boost this Teaching Profile”; SKU remains Listing Boost.

Gap vs locked intent: search still collapses listings to one card per tutor, so a boosted Physics profile can hide behind a higher-scoring History card (“Also teaches”).

### A.5 Search unit vs search display (the conflict)

**Query unit is already the listing.** `searchTutors()` (`src/lib/search-tutors.ts`) loads `SubjectProfile` where `status: "ACTIVE"` and parent tutor is publicly listable. Filters use **scalar** `contains` on `board`, `syllabusCode`, `level` / `qualification`, and also `tutorProfile.levels` as a fallback for level. Cards use listing subject/title/rate; identity comes from parent `TutorProfile`. Result links go to `/listings/{id}`.

**Display unit is one tutor.** After scoring, results pass through `dedupeSearchByTutor()` (`src/lib/search-dedupe.ts`): highest-scoring listing wins; siblings become “Also teaches…”. Tests assert two listings for tutor `t1` become **one** card. Pagination counts **deduped tutors** (`PAGE_SIZE = 12`).

**Locked display:** each matching Teaching Profile may appear as its **own** card. Broad/unfiltered search: **maximum 2 cards from the same `TutorProfile` per result page**. Subject-specific or strongly filtered search: show the matching profile (no extra per-tutor cap beyond relevance). “Also teaches” is a **secondary cross-link only**, not a substitute for a missing card.

Other collapsing to review in the same search phase:

- `dedupeFeaturedListingsByTutor` in `src/lib/featured-tutors.ts`.
- `similarTutors()` excludes the whole parent tutor (`excludeTutorProfileId`) — keep that so similar-rail does not show the same person’s other subjects as “similar tutors”.

### A.6 Entitlements and prices (live V2 — **KEPT**)

Source of truth: `src/lib/subject-profile-entitlements.ts` + `BUSINESS` in `src/lib/business-rules.ts`.

| Constant | Value | Meaning |
|----------|-------|---------|
| `FREE_SUBJECT_PROFILES` | **3** | Tutor Free active Teaching Profile cap — **permanent** |
| `TUTOR_PRO_SUBJECT_PROFILE_CAP` | **10** | Tutor Pro (`TUTOR_BASIC`) and grandfathered `EXTRA_PROFILE_ADS` |
| `BUSINESS.tutorFreeActiveListings` | 3 | Marketing consumes this |
| `BUSINESS.tutorProActiveListings` | 10 | Marketing consumes this |
| `isSubjectProfilePromoActive()` | **always `false`** | Listing-cap promo window **retired** — **do not revive** |
| `SUBJECT_PROFILE_PROMO_UNTIL` | `"2026-09-30"` | **Dead constant** for listing caps; kept for email/compat |

`resolveSubjectProfileActiveCap`: Unlimited (`UNLIMITED_ADS`) → ∞; Tutor Pro or Extra Profile Ads → 10; else → **3**. **No date branch. Do not add one.**

Over-cap: `enforceSubjectProfileCap` pauses oldest-updated ACTIVE rows. Called from `syncTutorBadges` and digest cron. **Do not add a 1 Oct job that pauses Free tutors from 3 down to 1.**

Public copy already says complete profile lists free; **up to 3** active teaching listings; Tutor Pro **up to 10**.

| Plan ID | Public name | Sold on `/pricing`? | List price | Listing entitlement |
|---------|-------------|---------------------|------------|---------------------|
| `TUTOR_BASIC` | **Tutor Pro** | Yes | **1,499**/mo (annual ≈ 9.6×); **promo 0 until 2026-09-30** | Up to **10** Teaching Profiles + ranking + unlimited enquiry reveals |
| `AD_BOOST` | Listing Boost | Yes (add-on) | **999** one-time / 30 days / **one Teaching Profile** | Does **not** raise cap |
| `HIGHLIGHTED_AD` | Listing Highlight (legacy) | Hidden as primary | **1,299** | Does not raise cap |
| `EXTRA_PROFILE_ADS` | Extra Profile Ads (legacy) | **No** (grandfather) | **999** | Maps to **Pro cap (10)** |
| `UNLIMITED_ADS` | Unlimited Profiles (legacy) | **No** (grandfather) | **1,999** | Unlimited |
| `VERIFIED_TUTOR` | Priority Verification Review | Yes | **2,999** | Queue only; **not** a listing SKU |

**No +1 Teaching Profile SKU.** Extra slots on Free are sold by upgrading to Tutor Pro (10). Do not resurrect Extra Profile Ads on `/pricing`.

**Separate 30 Sep 2026 promo (must not be confused with caps):** Tutor Pro itself is complimentary until 30 September 2026 (`promoUntil: "2026-09-30"`). That **price** promo may still end on the approved date. **Free Teaching Profile cap remains 3** before and after that date.

### A.7 Messaging / contacts (identity is the account) — **KEPT**

`Conversation` is unique on `(userAId, userBId)` — **one thread per student–tutor pair**. Do **not** change this unique key.

`relatedAdId` is stored on **create only** (listing id stuffed into a field named for legacy ads). A second message from another Teaching Profile **does not** open a new conversation and **does not** consume a second student contact.

Student free contacts: **3 new tutors / month** (`BUSINESS.studentFreeContactsPerMonth`), counted per **tutor user**, not per Teaching Profile.

**Improve:** retain Teaching Profile context in the thread (system/context line: subject, capability, rate). Do not create per-subject conversations.

### A.8 Reviews and verification — **KEPT at tutor level**

`Review` is unique on `(tutorProfileId, studentId)`. Identity verification, rating, reviews, recommendations, and trust markers stay on the **person**. A review may later reference a related Teaching Profile/subject; **do not** create per-profile rating systems in this implementation.

### A.9 SEO / public URLs (already listing-first) — **KEEP**

- `/listings/{id}` — subject listing page; sitemap includes ACTIVE public listings (priority 0.75).
- `/tutors/{id}` — person hub. If the tutor has **exactly one** ACTIVE Teaching Profile, canonical is the listing URL.
- Subject hubs `/s/{subject}` and city hubs list listings.
- Do **not** delete `SubjectProfile` ids. Do **not** migrate URLs merely because public terminology changes from “Teaching Listing” to “Teaching Profile”.

---

## B. Target product model

1. **Master profile = person only.** Photo, name, headline, bio, qualifications/education, experience, languages, location, verification, reviews, rating, account-level trust. General teaching-mode defaults (`online` / `inPerson`) may remain as **defaults** that new Teaching Profiles inherit (technical question 6).
2. **Do not add subjects on the master profile as an editable concept.** `TutorProfile.subjects` may remain temporarily as a **derived compatibility cache** of distinct ACTIVE Teaching Profile subjects. Tutors must not manually maintain it.
3. **Tutors create Teaching Profiles separately** — dedicated create/manage UI; wizard ends with an **explicit** first Teaching Profile (not a bulk picker, not `split(",")[0]`, not `"General tutoring"`).
4. **1 Teaching Profile = 1 canonical subject.** Board, curriculum, qualification, level, and syllabus code are **multi-value capabilities inside** that profile. Specializations/topics if already supported may live there too.
5. **Caps (LOCKED — live V2):** Free = **3** ACTIVE Teaching Profiles **permanently**; Tutor Pro = **10**. No date-dependent Free cap. No +1 SKU. Boost is visibility, not capacity.
6. **Each profile ads/lists separately** — keep per-profile Boost; search card must be the Teaching Profile so Boost on profile B can surface B.
7. **Search unit = Teaching Profile.** Capability matching (e.g. Cambridge + A Level + Mathematics + 9709) happens **inside** the subject profile, not by spawning extra Maths rows.
8. **Search display:** own card per matching Teaching Profile; **broad search max 2 cards per `TutorProfile` per page**; filtered search shows the matching profile; relevance-first ranking; Boost subordinate to subject/board/level/code fit.
9. **Listability:** email/account requirements + master identity completeness + **≥1 ACTIVE Teaching Profile** with valid rate and required subject data — **not** a CSV of subjects on the master. Master `hourlyRate` is not authoritative for search when listing rate exists.

Implementation **cannot** simply add uniqueness on today’s singular `subject` column and stop. Multi-value capabilities must be designed first (see §G).

---

## C. Wizard / UX

### C.1 Target onboarding

| Step | Content |
|------|---------|
| 1 | Profile photo |
| 2 | About you |
| 3 | Location |
| 4 | Qualifications / teaching preferences (identity/trust; optional teaching-mode defaults) |
| 5 | **Create your first Teaching Profile** (explicit) |

First Teaching Profile collects:

- one canonical subject
- base hourly rate
- teaching description
- online / in-person
- applicable **levels** (multiple)
- applicable **boards/curricula** (multiple)
- applicable **qualification stages** (multiple)
- syllabus / subject codes where relevant (multiple)

**Remove** `CatalogMultiSelect` bulk subject tags and “Add subject” on `TutorProfile`.  
**Do not** keep a “pick 8 subjects then we split them later” flow.  
**Do not** auto-create `"General tutoring"`.  
**Do not** create a listing from `profile.subjects.split(",")[0]`.

Wizard resume (`resolveTutorWizardResumeStep`) currently blocks on `profile.subjects` and master `hourlyRate`. It must resume on **“no Teaching Profile yet”** instead.

Completion / status card (`tutor-profile-completion`, `tutor-profile-status`, dashboard percent) must treat **first ACTIVE Teaching Profile** as the teaching gate, not the CSV.

### C.5 Phase 2 implemented (2026-08-30)

- Wizard steps: Profile photo → About you → Location → Qualifications / default lesson type → Create your first Teaching Profile (or Save profile if a valid ACTIVE listing already exists).
- `POST /api/profile/tutor` no longer requires `TutorProfile.subjects` and **does not** auto-create a listing from `subjects.split(",")[0]` or `"General tutoring"`. First Teaching Profile is created only when the tutor sends `firstTeachingProfile` and they do not already have a valid ACTIVE listing (existing Maths duplicates are left alone).
- First-profile writers dual-write `SubjectProfileCapability` rows + scalar display cache + `canonicalSubject`.
- Listability: `hasValidTeachingProfile` = ACTIVE + non-empty subject + rate ≥ 500 PKR + online or in-person. Master CSV and master `hourlyRate` are not sufficient.
- Unique index SQL **not applied**. Caps remain Free 3 / Pro 10. Search-dedupe unchanged.

### C.2 Where tutors create and manage Teaching Profiles

**Keep** `/dashboard/tutor?tab=profile#teaching-listings` (`TutorAdsManager`) as the manager: create one, edit, pause, activate, Boost, quality tips, cap meter.

Public copy:

- Teaching Profile / Teaching Profiles
- My Teaching Profiles
- Create Teaching Profile
- Edit Teaching Profile
- Boost this Teaching Profile

Cap meter: Free **3** / Pro **10** via existing `subjectProfilePromoLabel()` semantics (already permanent 3; do not reintroduce a sunset).

Do not require a second account or a second `TutorProfile` per subject.

Empty state: you are not in search for a subject until you publish a Teaching Profile.

### C.3 Ads per profile

Keep: Boost/Highlight checkout already takes `subjectProfileId`.  
Change: search display must not hide a boosted profile behind another subject’s only card.  
SKU remains **Listing Boost** (`AD_BOOST`). Boost does not add capacity.

Pause ⇒ hidden from search; Boost windows stay on the row.

### C.4 Surfaces that still talk like the bulk picker

Must be rewritten in the wizard/dashboard phase: wizard hints, dashboard hero, finish-step “scroll to My teaching listings”, nurture email *“Start by adding the subjects you teach”* (`src/lib/email.ts` / `email-nurture.ts`), `max={8}` mental model, become-a-tutor if it still implies one mega-profile.

---

## D. Search

### D.1 Search unit (capability matching)

Search continues to query Teaching Profiles (`SubjectProfile`), not the master CSV.

Examples:

- Student searches **“Physics tutor”** → Physics Teaching Profiles.
- Student searches **“Cambridge A Level Mathematics 9709”** → Mathematics Teaching Profiles whose **capability set** includes Mathematics + Cambridge + A Level + 9709.

This is also how Past Papers **Find a tutor** must work (Cambridge → A Level → Mathematics → 9709). **Do not** create a separate Mathematics profile per syllabus just to match papers.

Until capabilities are multi-value, today’s filters only match the **single** `board` / `level` / `qualification` / `syllabusCode` on the row (plus `contains` on title/description/keyword). A Maths tutor who stored GCSE on one row and 9709 on another would only match 9709 on the second row — after consolidation they must match on the **one** Maths profile.

Keep current score policy: Boost remains subordinate to subject/board/level/code relevance (`SEARCH_RANK_WEIGHTS` in search). Do not let Boosted Chemistry outrank a better Chemistry match.

### D.2 Search display

| Query type | Display |
|------------|---------|
| Subject-specific or strongly filtered (subject, board, level, syllabus code) | Show the **matching** Teaching Profile card(s). Same tutor may appear once for that match (typically one Maths profile). |
| Broad / unfiltered (e.g. location-only “tutor Rawalpindi”) | Each subject Teaching Profile may have its own card, but **maximum 2 cards from the same `TutorProfile` per result page**. Relevance-first among that tutor’s profiles. |

Each card: subject, listing title, listing rate, listing Boost, same tutor photo/name/verified/reviews. Link: `/listings/{id}`.

Replace `dedupeSearchByTutor` on the main search path with this policy (not a full no-op: broad search still needs a per-tutor-per-page cap of 2). Pagination counts **Teaching Profile cards**, with the diversity cap applied per page.

Exact classifier for “broad vs specific” is technical question 5. Direction: if the student (or Past Papers CTA) supplied a resolved subject and/or board/level/code filter, treat as specific; empty subject + generic keyword/location only is broad.

### D.3 “Also teaches”

Do **not** use “Also teaches” as a replacement for missing search cards.

It may remain as a **secondary cross-link** on search cards, listing pages, and the tutor hub. The actual matching Teaching Profile must still be eligible to appear independently (subject to the broad-search max 2 rule).

### D.4 Student-facing implications

| Topic | Today | Target |
|-------|--------|--------|
| Results page | One card; other subjects in “Also teaches” | Own card per matching subject; broad search ≤2 per tutor per page |
| Pagination | 12 **tutors** | 12 **cards**, diversity-capped on broad queries |
| Rank / Boost | Boost on listing B can lose to listing A, then B is buried in Also teaches | Boost on B can rank B’s **own** card; still loses to better subject fit |
| Contacts | 3 **tutors**/month | Unchanged — unique tutor, not per profile |
| Saved / recents | Can store `listingId` | Multiple saves of the same person possible — UX should show subject |

Update: `src/lib/search-tutors.ts`, `src/lib/search-dedupe.ts` (+ tests), `src/app/search/page.tsx`, search analytics (`listingIds` already supports many ids).

---

## E. Commercial — **KEEP Marketplace V2; REJECT 3→1 cliff**

### E.1 Rejected proposal (removed from this plan)

The earlier draft of this document proposed: Free **3 until 30 Sep 2026**, then **1** free + paid extras, with grandfathering options and a 1 Oct enforcement job.

**REJECTED.** Do not implement. Do not re-enable `isSubjectProfilePromoActive()` as a date check for listing caps. Do not rewrite `BUSINESS.tutorFreeActiveListings` to be time-dependent. Do not pause tutors from 3 ACTIVE profiles down to 1 on 1 October 2026.

V2 already retired the older “2 free until 30 Sep then 0” model. A new 3→1 cliff on the same calendar day as Tutor Pro leaving PKR 0 would collide with advertised “3 free listings” copy and is **not** approved.

### E.2 Locked commercial model

| | **Locked (live Marketplace V2)** |
|--|----------------------------------|
| Tutor Free active Teaching Profiles | **3, permanent** |
| Tutor Pro Teaching Profiles | **10** |
| After 30 Sep 2026 (Free caps) | Still **3** |
| After 30 Sep 2026 (Tutor Pro **price**) | Complimentary Tutor Pro may end → PKR 1,499/mo **if** they want to keep Pro ranking/10 slots/unlimited reveals; Free tutors who never had Pro **keep 3** |
| +1 Teaching Profile SKU | **None** — upgrade to Tutor Pro |
| Listing Boost | Per Teaching Profile; does not add capacity |
| Extra Profile Ads / Unlimited Ads | Grandfather only; not sold on `/pricing` |

Need more than 3? **Upgrade to Tutor Pro.**

---

## F. Entitlements timeline

**No listing-cap timeline.** Caps are not dated.

| Tutor | Active Teaching Profile cap |
|-------|-----------------------------|
| Free (no Tutor Pro / Extra / Unlimited) | **3** |
| Tutor Pro (`TUTOR_BASIC`) | **10** |
| Grandfather `EXTRA_PROFILE_ADS` | **10** while subscription active |
| Grandfather `UNLIMITED_ADS` | Unlimited |

Tutor Pro **price** promo through 30 September 2026 remains a **separate** commercial behaviour (`endOfPromoDay("2026-09-30")` in plans). It must not be wired into `resolveSubjectProfileActiveCap`.

---

## G. Schema options for multi-value capabilities (audit → recommendation)

**Constraint:** implementation cannot enforce subject uniqueness on the current schema and stop. A subject Teaching Profile must support **multiple** levels, boards/curricula, qualifications, and syllabus codes.

**Do not create a parallel `TeachingProfile` table.** Continue evolving `SubjectProfile` unless Phase 1 produces technical evidence that it cannot.

Physical schema is **not blindly locked** here; Phase 1 still designs columns/tables. After auditing `prisma/schema.prisma` and all `SubjectProfile` readers, the **safest recommended direction** is below.

### G.1 Option A — normalized join tables (recommended)

Child rows on `SubjectProfile`, e.g. one table with `(subjectProfileId, kind, value)` or four small tables (levels / boards / qualifications / syllabus codes). Unique per `(subjectProfileId, kind, value)`.

**Why this matches current code:**

- Search already filters with Prisma `contains` / `equals` on **indexed scalar strings** (`@@index([board, subject])`, `@@index([syllabusCode])`). Join tables keep those predicates first-class (`some: { value: … }`) and allow **AND** matching: Cambridge **and** A Level **and** 9709.
- Past Papers “Find a tutor” needs that AND across independent dimensions. One JSON blob makes GIN/index and Prisma filter quality worse.
- Duplicate detection, listing quality, SEO JSON-LD (`educationalLevel`, `provider` board), TutorAdsManager selects, listing/tutor hub chips, and `tutor-bio-ai` all read **one string per dimension** today. Join tables can still feed a display helper; they do not force every reader to parse JSON.
- The schema has **zero** `Json` or `String[]` columns today — join tables stay inside the existing relational style (PostgreSQL / Neon).

**Migration safety:** keep existing scalar `level`, `board`, `qualification`, `syllabusCode` as a **derived display cache** (e.g. primary or joined label) during dual-write so `/listings/{id}`, search cards, and sitemap do not break in one cut. Then move filters to relations.

### G.2 Option B — JSON / string-array fields (not recommended as primary)

Prisma `Json` or `String[]` on `SubjectProfile`.

**Why it is weaker here:**

- No Json/array pattern exists in this schema; it would be a new operational path.
- Prisma Json filtering is poorer for marketplace search; `String[]` `has`/`hasSome` is better but still needs GIN indexes via raw SQL, and uniqueness of values is weaker.
- Changing `board String?` → array/Json is a **breaking column type change** for every reader listed in G.1.
- Risk of stuffing `"Cambridge A Level"` as one token vs two capabilities — taxonomy correctness suffers.
- Acceptable only as a short-lived internal cache, not as the Past Papers matching source of truth.

### G.3 Option C — reuse existing taxonomy (use for canonical **subject**, not as the capability store)

Available taxonomy today:

- Prisma `Subject` (`name` unique) — **PastPaper-only**; not referenced by `SubjectProfile`.
- `src/data/curriculum.json` via `src/lib/curriculum.ts` — static board/level/subject/code **catalog**, not a DB relation.
- `resolveSubjectName` / `SUBJECT_ALIASES` / `SUBJECT_CODES` in `src/lib/search-smart.ts` — in-memory aliases (`maths` → Mathematics).
- `TutorProfile.levels` CSV — the anti-pattern we are leaving; search still falls back to it for level filters.

**C cannot store multi-value capabilities** (no listing↔board join exists). **C should be reused for canonical subject identity and Past Papers alignment:** normalize `SubjectProfile.subject` through existing aliases; optionally FK to `Subject` when a row exists. Custom tutor subjects outside the catalog must still be allowed (today’s CatalogMultiSelect “Add subject”).

### G.4 Recommendation (implemented in Phase 1 — see §G.5)

| Concern | Approach |
|---------|----------|
| Multi-value boards / levels / qualifications / syllabus codes | **Option A (join tables)** |
| Canonical subject uniqueness | Store a **normalized canonical subject key** (via `resolveSubjectName` / alias table), not raw free-text uniqueness alone. Optional FK to `Subject` when matched. |
| Display / SEO during cutover | Keep scalar columns as derived cache |
| Parallel Prisma model named `TeachingProfile` | **No** |
| “Just add `@@unique([tutorProfileId, subject])` on current columns” | **Unsafe** — see constraints below |

**Existing constraints that make a naive unique-on-subject cut unsafe:**

1. **Live duplicates by design.** V2 allowed GCSE Maths and A Level Maths as two ACTIVE rows. A unique index on `(tutorProfileId, subject)` would fail or block those tutors until consolidation. Production snapshot at V2 verification (2026-08-29): **103** `SubjectProfile` rows, **74** ACTIVE, **16** tutors with ≥1 ACTIVE listing — inventory in Phase 1 must count same-subject groups before any unique index.
2. **Alias collisions.** `"Maths"` and `"Mathematics"` are different strings; `resolveSubjectName` treats them as one canonical subject. Unique on raw `subject` would still allow two ACTIVE Maths profiles.
3. **ACTIVE vs PAUSED.** Product uniqueness is **active** only. Prisma `@@unique` applies to all rows. Partial unique index `WHERE status = 'ACTIVE'` needs **raw SQL**; Prisma schema cannot express it cleanly. Pause-then-recreate of the same subject must be designed (reuse paused row vs new id).
4. **Boost and URLs are per row id.** Merging two Maths listings means one surviving `/listings/{id}` and one Boost window. Survivor rule and redirect for the other id are Phase 1/9 work — **no auto-merge in this planning update**.
5. **Search level fallback to `TutorProfile.levels`.** After capabilities move, this fallback can false-positive. Plan to stop using master CSV for listing-level match.
6. **Cap math counts rows, not subjects.** `countActiveSubjectProfiles` / `enforceSubjectProfileCap` count ACTIVE `SubjectProfile` rows. After merge, a tutor with three Maths-by-level rows becomes one profile (frees cap). During dual existence, search and caps disagree.
7. **`TutorAd` dual-write** still keys off subject string. Search ignores it; admin history does not. Consolidation must not assume ads rows match 1:1.
8. **Quality and titles** assume one syllabus (e.g. “Cambridge O Level Chemistry 5070”). Multi-value UI must not require one code in the title.

Phase 1 produced the migration **preview** and checked in additive DDL. Production listing **rows** were not merged or paused. The SQL unique index is **gated** and will skip while ACTIVE collisions exist (see preview).

### G.5 Phase 1 implemented design (2026-08-30)

**Audit (writers of `SubjectProfile` level/board/qualification/syllabusCode):**

| Writer | Fields | Notes |
|--------|--------|-------|
| `src/app/api/tutor-ads/route.ts` | all four + `subject` | Create/update; duplicate guard is still **subject + level + board**. **Unchanged in Phase 1.** |
| `src/app/api/profile/tutor/route.ts` | `level` from master CSV first token | Auto-creates first listing. **Unchanged** (Phase 2 stops this). |
| `src/lib/seed-company.ts` | `level` | Seed. Unchanged. |
| `scripts/migrate-subject-profiles.ts` | `level` | Legacy TutorAd → listing. Unchanged. |

Boost/cap/admin writers (`listing-boost.ts`, `subject-profile-entitlements.ts`, `admin-actions.ts`) touch status/Boost only, not taxonomy scalars.

**Audit (readers of those scalars on listings):** `src/lib/search-tutors.ts` (contains/equals filters + rank), `src/lib/listing-quality.ts` (score + near-dup), `src/components/TutorAdsManager.tsx`, `src/app/listings/[id]/page.tsx` (chips + JSON-LD via `subjectListingJsonLd`), `src/app/tutors/[id]/page.tsx`, `src/app/ads/page.tsx`, `src/lib/tutor-bio-ai.ts` / `src/app/api/ai/tutor-bio/route.ts`, `src/lib/featured-tutors.ts`. Search still uses **scalars**; join tables are not queried yet (Phase 4).

**Schema (Option A — implemented):**

```
SubjectProfile  (name kept; /listings/{id} kept)
  canonicalSubject String @default("")     // uniqueness key; display remains `subject`
  level, board, qualification, syllabusCode  // display cache; NOT dropped
  capabilities SubjectProfileCapability[]

SubjectProfileCapability
  kind   String   // LEVEL | BOARD | QUALIFICATION | SYLLABUS_CODE
  value  String
  @@unique([subjectProfileId, kind, value])
  @@index([kind, value])
```

No Prisma `@@unique` on `(tutorProfileId, subject)` or `(tutorProfileId, canonicalSubject)` — that would also block **paused** duplicates.

**Unique index (SQL only):** `prisma/sql/teaching-profile-capabilities.sql`

```sql
CREATE UNIQUE INDEX "SubjectProfile_active_tutor_canonical_uidx"
  ON "SubjectProfile" ("tutorProfileId", (lower(btrim("canonicalSubject"))))
  WHERE status = 'ACTIVE' AND btrim("canonicalSubject") <> '';
```

Created only when the `DO $$` block finds **zero** ACTIVE collisions. Preview says **do not apply yet**.

**Canonical helper:** `canonicalTeachingSubject()` — `src/lib/teaching-profile-subject.ts`. Not wired to the wizard.

**Preview:** `npx tsx scripts/preview-teaching-profile-migration.ts` → `docs/MTH-TEACHING-PROFILES-PHASE1-PREVIEW.md`. Read-only.

Live snapshot (2026-08-30, this database): **106** listings, **77** ACTIVE, **33** tutors; **9** same-canonical groups (all alias/exam-family label pairs); **7** ACTIVE collision groups / **5** tutors (index **not** safe); **1** group with multiple levels to union (CSV stuffed into scalar `level`); **0** board/qual/code unions; **0** dual Boost windows; **1** dual Highlight window; **1** rate disagreement.

**Not done in Phase 1:** `prisma db push` / applying SQL to production; wizard; search-dedupe; entitlements 3/10; Boost; messaging; merging or pausing rows.

---

## H. Data migration (`TutorProfile.subjects` vs `SubjectProfile`)

### H.1 What exists

- `TutorProfile.subjects`: comma-separated blob; wizard writes up to 8 labels; completion requires it; emails, analytics, `student-tutor-matches`, some search keyword fallbacks still read it.
- `SubjectProfile`: source of truth for search; one **singular** taxonomy set per row.
- First profile save with zero listings materializes only the first CSV subject (or `"General tutoring"`). Extra master tags do **not** become listings until `TutorAdsManager`.

### H.2 Target

- **Source of truth:** Teaching Profile (`SubjectProfile`) — one row per canonical subject, capabilities inside.
- Master `subjects`: **derived cache** from distinct ACTIVE Teaching Profile subjects. Stop manual writes from the wizard.
- No new TeachingProfile table. Do not drop `subjects` column in the first implementation phase (many readers).

### H.3 Migration steps (when implementation is approved — preview first)

1. **Inventory** existing `SubjectProfile` rows (active/paused, subject labels, board/level/qualification/syllabusCode, Boost windows, `/listings/{id}`).
2. **Group** by `TutorProfile` + canonical subject (apply alias normalization in the preview, do not write yet).
3. **Identify** tutors with multiple rows of the same canonical subject.
4. **Do not delete or merge automatically.** Do not silently destroy indexed listing URLs.
5. Determine whether board/level/code data can be **consolidated safely** into multi-value capabilities on one surviving row.
6. **Migration preview** (report: keep id, redirect id, capability union, Boost conflict, cap impact).
7. Preserve existing listing ids/URLs **wherever possible** (prefer keep the highest-quality / most recently updated / boosted row; 301 the others only after explicit logic is approved).
8. Pause/redirect/merge **only after** that logic is approved (Phase 9).
9. Stop creating `"General tutoring"`.
10. **Do not explode** old CSV subjects into multiple automatic profiles (would blow caps and spam search). Prompt in dashboard: turn leftover CSV tags into Teaching Profiles within cap.

**Do not delete listing rows** to “clean” the blob. Pause, don’t destroy, when enforcing caps.

---

## I. SEO

| URL | Policy |
|-----|--------|
| `/listings/{id}` | **Keep forever** for existing ids. Search, sitemap, shares, analytics. Terminology change does not change the path. Paused listings: noindex (already). |
| `/tutors/{id}` | Keep as person hub. Canonical to sole listing only when exactly one ACTIVE Teaching Profile. Hub still aggregates identity + all Teaching Profiles. |
| `/s/{subject}` and city hubs | Continue to list **listings** (Teaching Profiles), not one mega-profile. |
| Sitemap | Keep listing + tutor routes. More search cards ≠ new URL scheme. |

**No orphaning:** cap enforcement must `PAUSED` not `delete`. Future same-subject consolidation: preserve surviving IDs; explicit canonical/redirect for merged ids — **not** deletion. Do **not** perform SEO migration in this planning update.

JSON-LD on listing pages describes the subject service; person schema stays on the hub. After multi-card search, avoid duplicate `sameAs` spam; listing pages can `mentions` the person hub. Multi-value capabilities will eventually replace singular `educationalLevel` / board provider fields — Phase 1 should specify display (e.g. primary + additional).

---

## J. Contacts, messaging, reviews

**Student contact limits are per unique tutor, not per Teaching Profile.** Student Free remains **3 new tutors/month**. Contacting Ahmed via Physics then opening Ahmed’s Mathematics profile does **not** consume another new-tutor contact.

**Conversation remains one student ↔ one tutor thread.** Do not change `@@unique([userAId, userBId])`.

**Do** retain Teaching Profile context: enquiry about A Level Physics / Cambridge / rate as a system or context line; pre-fill from listing CTA. `relatedAdId` on create is the current hook — extend display, do not split threads.

Reviews, rating, verification, recommendations: **tutor-level**. Optional later reference to a Teaching Profile; no per-profile ratings in this phase.

---

## K. Risks

Removed/reduced: 3→1 commercial cliff, grandfathering vs hard pause on 1 Oct, legal risk of reversing “3 permanent”, date-dependent `BUSINESS` copy drift for caps, complimentary-Pro + listing-cliff same-day messaging minefield.

**Retained / added:**

1. **Same-subject multi-row listings** — V2 allowed GCSE vs A Level as two profiles. Consolidation without preview can drop a Boosted URL or the wrong syllabus code. Mitigation: inventory → preview → explicit survivor/redirect (Phases 1 and 9).
2. **Singular board/level/code schema** — enforcing uniqueness on today’s columns without multi-value capabilities would **delete information** (second board/level has nowhere to live). Mitigation: Option A before uniqueness.
3. **Same tutor, multiple search cards** — students may think they are different people. Mitigation: consistent photo/name; optional “Same tutor” affordance; **max 2 cards per tutor per page on broad search**.
4. **Search diversity** — Pro tutors with 10 subjects could still occupy 2 of 12 broad slots; subject-filtered search is the healthy case. Keep relevance-first so weak extra subjects do not outrank specialists.
5. **Message/listing context** — one inbox thread; `relatedAdId` only on first message. Tutors may not see which subject the student meant. Mitigation: context line + listing CTA pre-fill; do not split `Conversation`.
6. **CSV compatibility** — many readers of `TutorProfile.subjects` (completion, wizard resume, nurture, analytics, request matching, keyword search). Removing wizard writes before derived sync lands causes empty CSV and listability deadlock.
7. **Canonical subject matching** — Maths vs Mathematics vs `math`; custom labels vs catalog. Wrong normalizer creates duplicate ACTIVE profiles or false merges (Chemistry vs Chemistry 5070-as-subject).
8. **Existing listing URL preservation** — indexed `/listings/{id}` must survive rename to “Teaching Profile” and any later merge (redirect, not delete).
9. **Boost fairness** — separate cards make Boost more powerful **within** a subject; keep current score weights so Boost cannot bury better board/level/code fit. Merging two boosted Maths rows needs a Boost-window rule.
10. **Multi-value taxonomy correctness** — capability tokens must match Past Papers (`curriculum.json`, `syllabusCode`) or “Find a tutor” from 9709 will miss the Maths profile. Do not free-text boards without normalization.
11. **Completion deadlock** — if subjects are removed from the wizard before listability accepts “has Teaching Profile”, tutors can never go live.
12. **Similar-rail** — already hides sibling listings of the same tutor; keep that so multi-card search does not also fill “similar” with the same face.

---

## L. Implementation phases

Gate: this document’s locked decisions (Phase 0, recorded here). **Phase 1 and Phase 2 are done.** Next is Phase 3 (subject uniqueness / duplicate detection tooling, still no silent merge).

| Phase | Work |
|-------|------|
| **0. Product lock** | Record all approved decisions from 2026-08-30 (this revision). **Done in this file.** No code. |
| **1. Schema / migration design** | Audit `SubjectProfile`. Option A join table. Canonical subject helper. Partial unique index (ACTIVE only, SQL, collision-gated). Read-only preview. **Done 2026-08-30** — see §G.5. |
| **2. Wizard / completion** | Remove master subject picker. Explicit first Teaching Profile. Listability from ACTIVE Teaching Profile + rate. Resume step. Stop blob auto-create and `"General tutoring"`. **Done 2026-08-30.** |
| **3. Subject uniqueness** | One ACTIVE canonical subject per tutor. Duplicate detection replaces subject+level+board. Safe consolidation **tooling** (preview, not silent merge). **NEXT.** |
| **4. Search** | Teaching Profile cards. Capability matching (board/level/qual/code). Broad search max 2 cards per `TutorProfile` per page. Relevance-first; Boost subordinate. Also teaches = secondary only. Review similar-rail and featured dedupe. |
| **5. Dashboard** | My Teaching Profiles. Create/edit/pause/activate. Cap meter Free 3 / Pro 10. Boost per Teaching Profile. Multi-value capability editors. |
| **6. Messaging context** | Keep one conversation per student–tutor. Retain subject/listing context in thread. |
| **7. Derived master subjects** | Sync `TutorProfile.subjects` from ACTIVE Teaching Profiles. Remove remaining manual writes. |
| **8. Past Papers integration verification** | Board/level/code capability matching from paper CTAs (e.g. Cambridge A Level Maths 9709). |
| **9. Migration** | Consolidate existing production data **after preview**. Preserve URLs. No destructive merge without preview. |
| **10. Production verification** | Onboarding, create/edit profiles, search (broad + filtered), messaging, Boost, caps 3/10, Past Papers find-a-tutor, SEO `/listings/{id}` + hubs, regression (no 3→1 cliff, no +1 SKU). |

**Out of scope until asked:** new public SKU name, +1 profile product, lesson escrow, splitting `Conversation` unique key, deleting `TutorAd`, renaming Prisma `SubjectProfile`, changing `/listings/{id}`, per-profile rating systems, date-dependent Free caps.

---

## M. Technical questions — answered in Phase 1 vs still open

Product questions are **answered** (see Decision log). Do not reopen them.

### Answered in Phase 1

1. **Physical schema** — Option A implemented as one join table `SubjectProfileCapability` (`kind` + `value`), unique `(subjectProfileId, kind, value)`. Scalar `level` / `board` / `qualification` / `syllabusCode` **kept** as display/compatibility cache. Prisma model remains `SubjectProfile`. No `TeachingProfile` table. Optional FK to Prisma `Subject` **deferred** (Past Papers catalog is not the teaching uniqueness key).
2. **Canonical subject rules** — `canonicalTeachingSubject()` in `src/lib/teaching-profile-subject.ts`. Reuses `resolveSubjectName` + `catalogSubjectNames()` / `SUBJECT_ALIASES` / `SUBJECT_CODES`. Exam-family prefixes (`GCSE Maths`, `A Level Physics`) collapse to the core subject. Trailing syllabus codes on a matched subject (`Chemistry 5070`) collapse. Custom unmatched labels stay verbatim; uniqueness is case-insensitive via `key`. Exam-prep products (SAT Prep, IELTS, CSS Prep) stay distinct. Stored on `SubjectProfile.canonicalSubject` (SQL first-pass copies trimmed `subject`; alias-aware backfill is Phase 3/9). Wizard UX unchanged.
3. **ACTIVE uniqueness mechanism** — **not** Prisma `@@unique([tutorProfileId, subject])` and **not** `@@unique` on all statuses. Raw SQL partial unique index `SubjectProfile_active_tutor_canonical_uidx` on `(tutorProfileId, lower(btrim(canonicalSubject))) WHERE status = 'ACTIVE' AND canonicalSubject <> ''`. DDL **skips** creating the index when ACTIVE collisions exist. Preview (2026-08-30): **7** ACTIVE collision groups / **5** tutors — **do not apply the index until Phase 9**. Pause-then-recreate must reuse the paused row (Phase 2/3 writers).

### Still open (Phase 3+ / 9)

3. **Migration of tutors who already hold several same-subject `SubjectProfile` rows** — survivor selection (quality, recency, Boost, traffic); capability union; conflict when two rows disagree. Preview inventory exists; **no merge**.
4. **How to preserve existing URLs during consolidation** — keep vs 301 vs canonical; what happens to Boost windows on the retired id. **No redirects in Phase 1.**
5. **Exact broad-vs-specific search classification** — Phase 4.
6. **Whether master teaching-mode fields** (`TutorProfile.online` / `inPerson`, and master `hourlyRate`) **remain defaults** inherited by new Teaching Profiles — **answered in Phase 2:** yes. Step 4 collects default lesson type; the first Teaching Profile inherits it (tutor can override on that step). Master `hourlyRate` is a cache copied from the first listing rate; **listability uses the Teaching Profile rate**, not the master field.

---

## Appendix — files that will change after approval (inventory only)

| Area | Files |
|------|--------|
| Schema | `prisma/schema.prisma`, `prisma/sql/teaching-profile-capabilities.sql` — **Phase 1 done.** Production apply of SQL is operator-led; unique index skips while collisions exist. |
| Caps | `src/lib/subject-profile-entitlements.ts` (+ tests), `src/lib/business-rules.ts`, `src/lib/subscription.ts` — **copy/terminology only; do not change 3/10 numbers or revive promo** |
| Wizard | `src/components/TutorProfileForm.tsx`, `src/lib/tutor-wizard.ts`, `src/lib/tutor-profile-completion.ts`, `src/app/api/profile/tutor/route.ts` |
| Manager / ads | `src/components/TutorAdsManager.tsx`, `src/app/api/tutor-ads/route.ts`, `src/lib/listing-quality.ts`, `src/app/dashboard/tutor/page.tsx` |
| Search | `src/lib/search-tutors.ts`, `src/lib/search-dedupe.ts` (+ tests), `src/app/search/page.tsx`, `src/lib/search-smart.ts` |
| Past Papers CTA | past-paper browse/search pages that link to tutor search with board/level/code |
| Copy | `src/lib/marketing-copy.ts`, dashboard strings, nurture email — **Teaching Profile** language; **do not** change Free=3 / Pro=10 |
| SEO | `src/app/listings/[id]/page.tsx`, `src/app/tutors/[id]/page.tsx`, `src/app/sitemap.ts` (ids stay) |
| Messaging | `src/app/api/messages/route.ts`, inbox UI, `ContactTutorForm` |
| Derived CSV | readers of `TutorProfile.subjects` listed in §H.1 |

---

## Decision log

| Date | Decision | Source |
|------|----------|--------|
| 2026-08-29 | V2: Free **3** permanent, Pro **10**; retire 2→0 listing-cap promo | Tracker + final implementation report |
| 2026-08-30 | **Rejected:** Free 3 until 30 Sep 2026 then 1 + paid extras; no grandfathering work for that cliff | This plan revision |
| 2026-08-30 | **APPROVED PRODUCT DIRECTION** (see box below) | User lock-in, this plan |
| 2026-08-30 | **PHASE 2 COMPLETE:** Wizard is photo → about you → location → qualifications / lesson defaults → explicit first Teaching Profile. Master bulk subject picker removed. No CSV auto-create / no `"General tutoring"`. Listability = email + master identity + ≥1 ACTIVE Teaching Profile with valid rate. Unique index still not applied. | This revision |

### 2026-08-30 — APPROVED PRODUCT DIRECTION

- Teaching Profile is **subject-based**.
- One tutor may have **one ACTIVE Teaching Profile per canonical subject**.
- Board, curriculum, qualification, level and syllabus are **multi-value capabilities inside** that subject profile.
- Master profile **no longer manually owns subjects** (`TutorProfile.subjects` = derived cache only).
- Search **operates on Teaching Profiles**.
- Broad search **max 2 cards per tutor per page**.
- Student contacts remain **per unique tutor**.
- Conversations remain **tutor-level** with listing context.
- Free = **3** Teaching Profiles **permanently**.
- Tutor Pro = **10**.
- **No +1** profile SKU.
- Listing Boost remains **per Teaching Profile** (does not add capacity).
- Public terminology = **Teaching Profile**.
- Prisma **`SubjectProfile`** and existing **`/listings/{id}`** URLs remain for migration safety.

**Removed / superseded decisions from the previous draft of this file:**

- Teaching Profile may be subject+level or subject+board (GCSE Maths and A Level Maths as two profiles) — **no**.
- Proposed 3→1 Oct 2026 Free cliff, dated `resolveSubjectProfileActiveCap`, 1 Oct pause job, grandfather options for that cliff — **no**.
- Open commercial questions (cliff? extra SKU price? Pro still 10? timezone for listing cliff?) — **closed**.
- Search: unlimited one-card-per-profile on generic queries with no per-tutor cap — **no** (max 2 on broad search).
- “Also teaches” as the way extra subjects appear — **no** (secondary cross-link only).
- Contacts per listing — **no**.
- New public +1 SKU or resurrect Extra Profile Ads — **no**.
- Parallel `TeachingProfile` table / rename Prisma model / change `/listings/{id}` — **no**.

---

TEACHING PROFILES PRODUCT MODEL — DECISIONS LOCKED

IMPLEMENTATION STATUS: PHASE 2 COMPLETE. UNIQUE INDEX STILL NOT APPLIED.

NEXT STEP:
Phase 3 — subject uniqueness / duplicate detection tooling (preview, not
silent merge). Do not start Phase 4–10 from this Phase 2 change set.
