# MTH — FINAL COMMERCIAL MODEL AUDIT

**Date:** 2026-08-31  
**Repo:** `C:\Tutor`  
**Scope:** Lock final commercial SoT + full-system gap audit + safe deterministic fixes only  
**Explicitly out of scope:** Teaching Profiles schema/migration Phase work; bulk Past Paper price changes; destructive listing deactivation  

---

## 1. Executive verdict

### FINAL COMMERCIAL MODEL — ACTION REQUIRED

Runtime prices, Free=1 create gate, Pro=10, annual ×9.6 display prices, Boost 30/365, and most public copy are aligned with the finalized model.

**Not fully aligned** until these blockers are approved/resolved:

1. **6 Free tutors** currently have **2–3+ ACTIVE Teaching Profiles** (grandfathered under prior Free=3). Create gate is Free=1; **auto-pause is deliberately OFF** pending transition approval.
2. **Priority Verification Review** does not reorder the admin verification queue (payment activates SKU only).
3. **Student referral +1 contact bonus** exists in `plan-limits` but is **never called** from signup (Hub Points referral only).
4. **No Google Ads / conversion event instrumentation** in app code.
5. Past Paper monetization is a **global fee** (PKR 100) — no per-paper FREE/PAID DB flag explaining indexed “FREE” syllabus pages.

---

## 2. Final commercial model table

| Product | Price (PKR) | Billing | Entitlements |
|---------|-------------|---------|--------------|
| Student Free | 0 | Free | Search; **3 new tutor contacts/mo**; replies free; browse papers; browser exam tools; **no** request ads; **no** AI |
| Student Pass | 1,999/mo · 19,190/yr | Monthly or annual | Unlimited contacts; request ads; **10** paper downloads/mo |
| Student Pro | 3,499/mo · 33,590/yr | Monthly or annual | Pass + unlimited papers + AI |
| Tutor Free | 0 | Free | List when complete; **1 ACTIVE Teaching Profile**; receive/reply; **3 reveals/mo** when tutor initiates; AI after email verify; 0% lesson commission |
| Tutor Pro | List 1,499/mo · **0 until 30 Sep 2026** · 14,390/yr | Promo then monthly/annual | Up to **10** Teaching Profiles; relevance ranking; unlimited reveals; analytics; request access |
| 30-Day Listing Boost | 999 | One-time · 30 days | One Teaching Profile; no capacity; not a subscription |
| 365-Day Listing Boost | 9,590 | One-time · 365 days | Same; ≈20% off vs 12×30-day |
| Priority Verification Review | 2,999 | One-time | Queue priority **claim**; badge only after admin approval |
| Past paper download | **100** default | Per paper when not covered | Browse free |

**Universal:** 0% lesson commission · annual ≈ monthly×9.6 (**“Save 20% with annual billing”**) · Safepay when live · no false auto-renew claims.

---

## 3. Source-of-truth map

| Concern | Canonical runtime source | Notes |
|---------|--------------------------|-------|
| Teaching Profile caps | `src/lib/subject-profile-entitlements.ts` (`FREE_SUBJECT_PROFILES=1`, Pro=10) | Create gate live; Free auto-pause gated by `ENFORCE_FREE_TEACHING_PROFILE_CAP` |
| Marketing facade | `src/lib/business-rules.ts` → `BUSINESS.*` | Prefer this for UI |
| Plan catalog / prices / promo | `src/lib/plans.ts` + SiteSettings overrides | Annual via `defaultAnnualPricePkr` |
| Contacts / reveals / papers | `src/lib/plan-limits.ts` | UTC month buckets |
| Subscription gates | `src/lib/subscription.ts` | Messaging, AI, request ads, badges |
| Boost windows | `src/lib/listing-boost.ts` + `safepay-complete.ts` | 30 or 365 days |
| Checkout | `src/app/api/safepay/checkout/route.ts` | One-shot Safepay |
| Ranking | `src/lib/search-tutors.ts` | Relevance fields dominate; Pro/Boost are small additives |
| Past paper fee | SiteSettings `pastPaperFeePkr` (default 100) | Global, not per paper |
| Public compare | `marketing-copy.ts`, `free-vs-paid.ts` | |
| Billing footnotes | `payments-status.ts` | 30-Day / 365-Day wording |

**Do not** treat stale docs (`MTH-WHOLE-SITE-CONSISTENCY-AUDIT.md`, older V2 tracker Free=3) as runtime law.

---

## 4. Runtime rules changed (this task)

| Change | Detail |
|--------|--------|
| Free auto-pause guard | `shouldEnforceFreeTeachingProfilePause()` — Free over-cap listings **not** paused unless `ENFORCE_FREE_TEACHING_PROFILE_CAP=1` |
| Annual public wording | `ANNUAL_SAVE_LABEL` = **“Save 20% with annual billing”** (no “2 months free”) |
| Boost naming | 30-Day / 365-Day Listing Boost in plans, footnotes, dashboard CTAs |
| Receipt | Annual Boost shows **365-day** window when `billingPeriod=annual` |
| Post-verify copy | Removed stale “ads” as Pro benefit wording |

Create gate Free=1 was already live from prior commit (`a94f130`).

---

## 5. Public copy changed

- `plans.ts` Boost description/features  
- `payments-status.ts` add-on footnotes  
- `PricingPlansClient` via `ANNUAL_SAVE_LABEL`  
- `TutorAdsManager` CTA labels  
- `how-it-works`, `help`, `free-vs-paid`  
- `receipt/[id]` Boost duration  
- `PostVerifyChecklist`  
- `docs/MTH-TEACHING-PROFILES-PLAN.md` commercial assumptions → Free=1  

---

## 6. Tutor Free 3→1 impact analysis

| Layer | Status |
|-------|--------|
| Constant `FREE_SUBJECT_PROFILES` | **1** |
| New create / reactivate gate | Enforces **1** |
| Marketing / pricing / help | Aligned to **1** |
| Auto-pause of existing Free>1 | **Blocked** pending approval |
| Docs still mentioning Free=3 | Historical audit docs left as history; Teaching Profiles plan updated |

---

## 7. Existing tutor production impact (read-only query 2026-08-31)

Script: `scripts/audit-free-tutor-cap-impact.ts` (Postgres production URL)

| Metric | Count |
|--------|------:|
| Tutors (not suspended) | 31 |
| Free (no Pro/legacy pack) | 16 |
| Tutor Pro (`TUTOR_BASIC`) | 15 |
| Legacy Extra / Unlimited | 0 / 0 |
| Free with **0** ACTIVE | 7 |
| Free with **1** ACTIVE | 3 |
| Free with **2** ACTIVE | 3 |
| Free with **3+** ACTIVE | 3 |
| **Free over Free=1 cap** | **6** |
| Free with live Boost | 0 |
| Public-eligible tutor profiles | 15 |
| ACTIVE SubjectProfiles (all) | 53 |
| Past papers total / published | 29694 / 29694 |
| SiteSettings `pastPaperFeePkr` | **100** |

**Recommendation (needs approval — not applied):**

1. Keep create gate at 1 (done).  
2. Keep auto-pause OFF (done this task).  
3. Notify 6 over-cap Free tutors: keep one ACTIVE subject or upgrade to Tutor Pro (complimentary until 30 Sep 2026).  
4. Only then set `ENFORCE_FREE_TEACHING_PROFILE_CAP=1` (or run a supervised pause job).  
5. Do **not** delete or merge Teaching Profiles without a separate approved plan.

---

## 8. Student contact entitlement audit

| Rule | Verdict |
|------|---------|
| Free 3 new tutors/month | **ALIGNED** (`STUDENT_FREE_CONTACT_LIMIT`) |
| Existing thread replies do not consume | **ALIGNED** (usage only on new conversation start) |
| Pass/Pro unlimited | **ALIGNED** (`hasStudentMessagingPass`) |
| Monthly reset | **PARTIAL** — UTC calendar month |
| Race safety | **GAP** — check-then-act; no unique usage constraint |
| Referral +1 contact | **GAP** — `applyReferralSignup` never called |

---

## 9. Tutor reveal entitlement audit

| Rule | Verdict |
|------|---------|
| Free 3/mo when tutor initiates | **ALIGNED** (`enquiry_reveal` on new tutor→student thread) |
| Reply to inbound student does not consume | **ALIGNED** |
| Tutor Pro unlimited | **ALIGNED** (`hasPaidTutorPlan`) |
| Meaning of “reveal” | New tutor-initiated conversation (not contact unmasking) |

Same UTC / race soft spots as contacts.

---

## 10. Request-ad audit

| Actor | Verdict |
|-------|---------|
| Student Free cannot post | **ALIGNED** (`canPostAd`) |
| Pass/Pro can post | **ALIGNED** |
| Tutor Free vs Pro browse `/ads` | **PARTIAL** — browse open; difference is reveal limit + Pro marketing (“enhanced access”), not a hard browse gate |

---

## 11. AI entitlement audit

| Actor | Verdict |
|-------|---------|
| Student Free / Pass | **ALIGNED** — study AI requires Student Pro (server `/api/ai/chat`) |
| Student Pro | **ALIGNED** |
| Tutor after email verify | **ALIGNED** for study assistant |
| Support chatbot `/api/ai/support` | Separate product; signed-in users |
| Tutor bio AI | Does not re-check email verify (tutor-only route) |

---

## 12. Annual pricing audit

| SKU | Display | Formula check |
|-----|---------|---------------|
| Student Pass | 1,999 / 19,190 | 1999×9.6 = 19190.4 → **19190** ✓ |
| Student Pro | 3,499 / 33,590 | 3499×9.6 = 33590.4 → **33590** ✓ |
| Tutor Pro | 1,499 / 14,390 | 1499×9.6 = 14390.4 → **14390** ✓ |
| Listing Boost | 999 / 9,590 | 999×9.6 = 9590.4 → **9590** ✓ |

Public wording updated to **“Save 20% with annual billing”**.

---

## 13. 30/365 Boost architecture finding

| Item | Finding |
|------|---------|
| Architecture | **One SKU `AD_BOOST`** + `billingPeriod` once vs annual → 30 vs 365 days |
| Capacity | Does **not** add Teaching Profiles |
| Subscription | One-time; not auto-renew |
| Schema change needed? | **No** for current design |
| Preferred names | **30-Day Listing Boost** / **365-Day Listing Boost** (applied in copy) |
| Alternate two-SKU design | Not required; would be a larger checkout/receipt change |

---

## 14. Verification audit

| Rule | Verdict |
|------|---------|
| Payment never auto-awards Identity Verified | **ALIGNED** (admin approve only) |
| Queue priority for paid Priority Review | **GAP** — admin queue sorts by `createdAt` only |
| Wording (not qualification / quality / background) | Public copy largely aligned |

---

## 15. Past Paper pricing/data findings

| Item | Finding |
|------|---------|
| Canonical default fee | **PKR 100** (SiteSettings + code default) — **confirmed live** |
| Per-paper FREE/PAID field | **Does not exist** |
| Why some Google/index pages look FREE | Likely browse/catalog UX or Pass/Pro entitlement paths — **not** a per-syllabus price column. Needs product confirmation before any bulk update |
| Quotas | Pass 10/mo · Pro unlimited · browse free — **ALIGNED** |
| Counts | TOTAL **29694**; all currently published/public/active in this DB snapshot |
| Bulk change | **NOT applied** (per task rules) |

---

## 16. Search / ranking findings

Relevance signals (subject / board / syllabus / level / location) dominate the score. Paid additives are small (`planTier×5`, boost `+2`, highlight `+1`, verified `+1`).  

**Verdict:** Generally **RELEVANCE FIRST** as required. Paid status cannot alone bury a strong subject match under typical filters.

**Not done:** Teaching Profiles Phase 1 schema work (explicitly forbidden).

---

## 17. Marketplace liquidity snapshot (2026-08-31 DB)

| Metric | Value |
|--------|------:|
| Tutors | 31 |
| Free / Pro | 16 / 15 |
| Public-eligible tutor profiles | 15 |
| ACTIVE Teaching Profiles | 53 |
| Free over Free=1 | 6 |
| Past papers | 29,694 |

Liquidity is still early-stage — acquisition and conversion instrumentation matter more than SEO volume.

---

## 18. Teaching Profiles plan changes

Updated commercial assumptions in `docs/MTH-TEACHING-PROFILES-PLAN.md`:

- Free **1** permanent · Pro **10**  
- Boost **30-Day / 365-Day**  
- Pointer to this audit as commercial law  

**Not reopened:** one canonical subject per profile; multi-value capabilities; `/listings/{id}`; conversation uniqueness; search diversity rules.

---

## 19. Google Ads / conversion readiness

**Finding:** No `gtag` / GTM / `dataLayer` / Ads conversion snippets found in `src/`.

**Recommended primary events (do not optimize page views):**

| Funnel | Events |
|--------|--------|
| Student | `sign_up_student`, `search`, `view_teaching_profile`, `start_tutor_contact`, `post_requirement`, `purchase_student_pass`, `purchase_student_pro`, `purchase_past_paper` |
| Tutor | `sign_up_tutor`, `email_verified`, `profile_complete`, `first_teaching_profile_active`, `enquiry_received`, `tutor_pro_activate`, `listing_boost_purchase`, `priority_verification_purchase` |

External Google Ads account configuration is **out of scope** for this task.

---

## 20. SEO / acquisition findings

Strengths: subject landings, past-paper → tutor CTAs, Teaching Profile URLs, sitemap patterns already in product.

Risks: thin zero-result combos; commercial copy drift in cached SERP snippets (“Tutor Basic” / “subject ads” may still appear in **index cache** even when live `/how-it-works` is clean).

Live `/how-it-works` audited: uses Teaching Profile / Tutor Free / Listing Boost language (updated).

---

## 21. Mobile / funnel findings

No redesign performed. Known funnels (search → contact; tutor register → Teaching Profile; past paper → paywall) remain the conversion spine. No new safe mobile CSS regressions fixed in this pass (none newly identified as deterministic blockers).

---

## 22. Legal / trust flags (need policy/lawyer if expanding)

| Claim | Product status |
|-------|----------------|
| 0% lesson commission | Aligned in product/copy |
| Direct tutor payment | Aligned |
| Identity Verified meaning | Aligned in copy; enforce in UI continuously |
| Priority Review ≠ badge | Copy aligned; **queue jump not implemented** |
| Auto-renew | Terms hedge correctly for current Safepay one-shot |
| Minors / safeguarding | Do not invent policy in code |
| Past paper copyright | Existing disclaimers — do not invent ownership claims |

---

## 23. Tests / build

| Check | Result |
|-------|--------|
| `public-commercial-consistency.test.ts` | OK |
| `subject-profile-entitlements.test.ts` | OK |
| `tsc --noEmit` | OK |

Expanded assertions: Free=1, annual label wording, 30-Day/365-Day Boost footnotes, approved annual prices.

Full production `next build` not required for this audit pass; run before next production deploy.

---

## 24. Files changed

- `src/lib/subject-profile-entitlements.ts` — Free pause guard  
- `src/lib/plans.ts` — annual wording + Boost naming  
- `src/lib/payments-status.ts`  
- `src/lib/free-vs-paid.ts`  
- `src/lib/public-commercial-consistency.test.ts`  
- `src/lib/subject-profile-entitlements.test.ts`  
- `src/components/TutorAdsManager.tsx`  
- `src/components/PostVerifyChecklist.tsx`  
- `src/app/how-it-works/page.tsx`  
- `src/app/help/page.tsx`  
- `src/app/receipt/[id]/page.tsx`  
- `docs/MTH-TEACHING-PROFILES-PLAN.md`  
- `docs/MTH-FINAL-COMMERCIAL-MODEL-AUDIT.md` (this file)  
- `scripts/audit-free-tutor-cap-impact.ts` (read-only audit helper)

---

## 25. Database changes

**NONE applied.**

- No Teaching Profile pauses/deletes/merges  
- No Past Paper price bulk update  
- No schema migration  
- Read-only counts via audit script only  

---

## 26. Production deployment status

Safe code fixes in this commit should be pushed to `main` with usual deploy.  

**Do not** set `ENFORCE_FREE_TEACHING_PROFILE_CAP=1` in production until the Free>1 transition is approved.

---

## 27. Exact remaining blockers

1. Approve Free>1 grandfather transition (notify / choose survivor / then enforce pause).  
2. Implement Priority Review **queue ordering** or soften public “queue priority” claim.  
3. Wire `applyReferralSignup` **or** remove/document referral contact bonus as Hub Points–only.  
4. Harden usage metering against races (optional unique constraint / transaction).  
5. Add conversion event layer for Ads (no Ads account setup in-repo).  
6. Decide Past Paper “FREE page” explanation before any bulk fee work.  
7. Reconcile remaining historical docs that still say Free=3 (non-runtime).

---

## 28. Recommended next implementation phase

**Not** Teaching Profiles schema Phase 1.

Recommended order:

1. **Free>1 transition playbook** (comms + optional supervised pause)  
2. **Priority Verification queue sort** (deterministic, small)  
3. **Conversion events** for student/tutor purchases and first Teaching Profile live  
4. **Referral contact bonus** wire-or-retire decision  
5. Past Paper commercial UX clarity (why some indexed pages look free)  

---

## FINAL STATUS

# FINAL COMMERCIAL MODEL — ACTION REQUIRED

Commercial constants and most public surfaces match the locked model. Production Free tutors over the new cap, Priority Review queue behavior, referral contact wiring, and Ads instrumentation keep the system from a clean “ALIGNED” claim.
