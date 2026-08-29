# MTH Marketplace V2 — Commercial Audit

**Date:** 2026-08-29  
**Status:** Phase 1 complete (audit). Implementation may proceed only for non-blocking technical/copy alignment.  
**Governing target:** Marketplace V2 Master Product & Business Model + Commercial Addendum (this chat).  
**Related tracker:** [`docs/MTH-MARKETPLACE-V2-TRACKER.md`](./MTH-MARKETPLACE-V2-TRACKER.md)

**Principle:** Live plans, add-ons, listing limits, and wording are **legacy**, not immutable contracts. Build toward the **clean target model**. Preserve existing paid users and entitlements safely during migration.

---

## 1. Executive summary

| Area | Live today | V2 target | Gap severity |
|------|------------|-----------|--------------|
| Student Free / Pass / Pro | Largely aligned | Same shape | Low (copy polish) |
| Tutor Free / Pro | Marketed as **Tutor Basic** + many add-ons | **Tutor Free** + **Tutor Pro** | Medium |
| Teaching listing caps | Code: **2 free → 0 after 30 Sep 2026**; paid packs 3 / unlimited | ONE canonical Free/Pro cap | **High** (public copy still contradicts) |
| Add-ons | Verified + Highlight + Boost + Extra + Unlimited | Tutor Pro + optional Listing Boost; Verification = trust process | High |
| Verification | Paid SKU + admin review badge | Badge earned via review; Priority Review optional | Medium |
| Search | Dedupe done; **boost outweighs relevance** | Boost subordinate to relevance | Medium |
| Rates | Listing `rate` used in search; profile `hourlyRate` still required for listability | Listing authoritative; profile legacy | Low–medium |
| Past papers | Pass 10/mo, Pro unlimited, + pay-per-paper | One coherent entitlement model | Medium |
| Payments | Safepay for platform SKUs; no lesson escrow | Same until separate approval | Low (wording) |
| Public copy | Multiple sources; some fixed, some stale | One source of truth | **High** on become-a-tutor |

**User preference (FLAG — not auto-finalized):** *2 teaching listings free until 30 Sep 2026; more require pay; after 30 Sep all paid.* Code and most marketing already encode this; **Become a Tutor** still says “unlimited free” — treat as contradiction against preference + code.

---

## 2. Current live rules (product as enforced / sold)

### 2.1 Students

| Capability | Free | Student Pass | Student Pro |
|------------|------|--------------|-------------|
| Search & browse tutors | Yes | Yes | Yes |
| New tutor contacts / month | **3** (+ referral bonus contacts) | Unlimited | Unlimited |
| Reply in existing threads | Yes | Yes | Yes |
| Student Requests (“need a tutor”) | No | Yes | Yes |
| Past paper downloads (plan entitlement) | Browse library; download needs Pass/Pro or pay-per-paper | **10 / month** | Unlimited |
| AI Study Assistant | No | No | Yes |
| Exam countdown / study progress | Yes (browser-local) | Yes | Yes |
| Lesson fees | Off-platform; **no commission** | Same | Same |

**Sources:** `plan-limits.ts`, `subscription.ts` (`hasStudentMessagingPass`, `canPostAd`, `canUseStudyAssistant`), `free-vs-paid.ts`, `plans.ts`.

### 2.2 Tutors

| Capability | Free (complete + email-verified) | Tutor Basic (promo / paid) | Other SKUs |
|------------|----------------------------------|----------------------------|-----------|
| Master profile | 1 | 1 | — |
| Appear in search | Yes if listable | Yes (+ priority tier) | Verified raises planTier further |
| Teaching listings (active SubjectProfiles) | **2 until 2026-09-30 UTC end-of-day; 0 from 2026-10-01** | Cap **3** (with Extra Profile Ads same) | **Unlimited Profiles** → ∞ |
| Receive / reply to student messages | Yes (reply even pre-email-verify for inbound) | Yes | — |
| Enquiry reveals (tutor initiates) | **3 / month** | Unlimited | Also unlocked by Extra / Unlimited Profiles |
| Lesson fee share | **100%** (no platform cut) | 100% | 100% |
| Ranking | planTier 0 | planTier 1 | VERIFIED_TUTOR → planTier 2 |
| Verified badge | Via admin document approval only | Same | Paying VERIFIED_TUTOR = priority queue / marketing “badge”, not auto-grant |
| Highlight / Boost | Paid per listing (30 days) | Same | `HIGHLIGHTED_AD`, `AD_BOOST` |

**Promo:** Tutor Basic list **PKR 1,499/mo**, complimentary (**PKR 0**) until **2026-09-30** (`plans.ts`).

### 2.3 Catalog prices (code defaults — admin may override via site settings)

| Plan ID | Public name | Audience | Monthly PKR | Notes |
|---------|-------------|----------|-------------|-------|
| STUDENT_PASS | Student Pass | Student | 1,999 | Annual ≈ 9.6× |
| STUDENT_PRO | Student Pro | Student | 3,499 | |
| TUTOR_BASIC | Tutor Basic | Tutor | 1,499 | Promo 0 until 30 Sep 2026 |
| VERIFIED_TUTOR | Verified Tutor | Tutor add-on | 2,999 | One-time style add-on |
| HIGHLIGHTED_AD | Highlighted Profile | Tutor add-on | 1,299 | Per listing |
| AD_BOOST | Profile Boost | Tutor add-on | 999 | Per listing |
| EXTRA_PROFILE_ADS | Extra Profile Ads | Tutor add-on | 999 | Up to 3 listings |
| UNLIMITED_ADS | Unlimited Profiles | Tutor add-on | 1,999 | Unlimited listings |

Env price IDs still use `STRIPE_PRICE_*` names; checkout path is **Safepay** when configured.

### 2.4 Payments (live behaviour)

- Platform subscriptions / add-ons / past-paper purchases: **Safepay** hosted checkout when keys present.
- `isPaidCheckoutLive()` = Safepay configured **and** env = **production**. Otherwise UI shows “coming soon” / manual activation email.
- **No** lesson escrow, custody, or tutor payouts in product scope.
- DB still has Stripe-shaped fields (`stripeSubscriptionId`, etc.) reused for Safepay trackers.
- Refund policy claims **automatic renewal**; cancellation is **email admin** (not self-serve portal). Stripe webhook route still exists as legacy path.

---

## 3. Current code rules (canonical enforcement map)

| Concern | Canonical module(s) | Rule |
|---------|---------------------|------|
| Student contacts | `plan-limits.ts` → `canPerformAction("tutor_contact")` | Free 3 + referral bonus; Pass/Pro unlimited |
| Student requests | `subscription.ts` → `canPostAd` | Requires STUDENT_PASS or STUDENT_PRO |
| Study assistant | `subscription.ts` → `canUseStudyAssistant` | Students: STUDENT_PRO; tutors/admins: free (caller checks email) |
| Past paper plan downloads | `plan-limits.ts` → `canDownloadPastPaper` | Free: not via plan; Pass: 10/mo; Pro: unlimited; plus separate `PastPaperPurchase` |
| Tutor search visibility | `tutor-public-eligibility.ts` + `syncTutorBadges` | `active = forceActive \|\| (emailVerified && profile complete)` |
| Listing caps | `subject-profile-entitlements.ts` | Promo 2 / post-promo 0; Basic\|Extra → 3; Unlimited → ∞; `enforceSubjectProfileCap` |
| Enquiry reveals | `plan-limits.ts` + `hasPaidTutorPlan` | Free 3; Basic\|Extra\|Unlimited → unlimited |
| Plan tier ranking | `subscription.ts` → `computeTutorPlanTier` | Verified SKU → 2; Basic → 1; else 0 |
| Verified badge | Admin `verify_approve` / `set_verified` only | Subscription does **not** set `verified: true` in `syncTutorBadges` |
| Per-listing boost/highlight | `listing-boost.ts` + checkout notes | Bound to `subjectProfileId` |
| Search unit + dedupe | `search-tutors.ts` + `search-dedupe.ts` | Match SubjectProfiles; one tutor via best score; Also teaches |
| Marketing strings | `marketing-copy.ts` + `business-rules.ts` | Intended single source; **pages still hardcode drift** |
| Checkout live flag | `payments-status.ts` | Production Safepay only |

---

## 4. Contradictions (live vs live, and live vs V2)

### 4.1 Critical — listing limits

| Surface | Claims | Code / preference |
|---------|--------|-------------------|
| `subject-profile-entitlements.ts` | 2 free until 30 Sep 2026; then 0 | Canonical enforcement |
| `marketing-copy.ts` `TUTOR_FREE_LISTING_LINE` | Same as code | Aligned |
| About, Help, Free-vs-Paid, homepage tutor blurb, Terms | Mostly 2 free / paid after | Aligned |
| **`/become-a-tutor` step 3** | **“Subject profiles are unlimited free during the same launch.”** | **Contradicts code + user preference** |
| Historical confusion | “2 vs 3 vs unlimited” across Extra / Basic / Unlimited / Free | Still three paid paths for caps |

**FLAG:** Prefer 2 free until 30 Sep 2026 then all paid — **needs business confirmation** before treating as final commercial policy (already partially shipped in code).

### 4.2 Tutor product naming

| Live public | V2 target |
|-------------|-----------|
| Tutor Basic (+ Extra Profile Ads, Unlimited Profiles) | Tutor Free + Tutor Pro |
| Multiple SKUs for listing caps | Cap owned by Free/Pro only |
| “Tutor Basic required” implied in some older mental models | Free tutors appear in search if eligible |

Code already allows free search listing; naming still centres **Tutor Basic**.

### 4.3 Verification

| Live | V2 |
|------|-----|
| Sold as “Verified Tutor” add-on with “trusted badge” features in `plans.ts` | Badge earned via successful identity review; belongs to tutor identity |
| Free-vs-paid: “Add-on” + “Admin document review… Verified Tutor plan prioritises the queue” | Verification ≠ buy badge; Priority Review may remain paid temporarily |
| Code correctly does **not** auto-approve from payment | Migration must not auto approve/revoke |

### 4.4 Boost vs relevance (search)

Target: boost **subordinate to relevance**.  
Live scoring (`search-tutors.ts`): `boost * 1000` and `tierScore * 100` dominate subject/board/code match (e.g. subject +50, board +40, code +80). **Boost can bury relevance.**

### 4.5 Payments / billing copy

| Claim | Reality |
|-------|---------|
| Refund: “renew automatically” | Recurring Safepay renewal not fully self-serve; cancel via email |
| Help / Free-vs-paid: Safepay “when live” + manual activation | Correct when not production; if production live, “coming soon” banners must not show |
| Privacy: “Safepay (Stripe fields may store…)” | Accurate legacy field reuse; confusing for users |
| Env / admin: `STRIPE_PRICE_*`, Stripe checkout route | Legacy naming vs Safepay-first product |

### 4.6 Student messaging myths (mostly fixed)

Earlier “Pass required to message” on some past-paper CTAs was corrected in prior sprints. Current Free-vs-Paid / homepage / marketing-copy align with **3 free contacts**. Keep monitoring AI support / emails for drift.

### 4.7 Rates

Search cards use **listing `rate`**. Profile `hourlyRate` remains required for **listability / completion**. V2: listing rate authoritative; profile hourlyRate legacy-only — completion gate still couples them.

### 4.8 Past papers

| Path | Behaviour |
|------|-----------|
| Free | Browse; no plan downloads |
| Pass | 10 downloads/mo |
| Pro | Unlimited downloads |
| Pay-per-paper | `PastPaperPurchase` (user or guest) via Safepay |

Coherent enough technically; public explanation still splits “subscription entitlement” vs “buy this paper” without one entitlement narrative.

---

## 5. Legacy products (keep in DB; simplify publicly)

| Legacy ID | Role today | V2 disposition |
|-----------|------------|----------------|
| `TUTOR_BASIC` | Growth plan (priority + reveals + 3 listings) | Map → **Tutor Pro** (internal alias OK) |
| `EXTRA_PROFILE_ADS` | Cap → 3 + unlimited reveals | Fold into Tutor Pro entitlement; grandfather holders |
| `UNLIMITED_ADS` | Cap → ∞ + unlimited reveals | Fold into Pro (or higher Pro tier) **after** listing-cap approval; grandfather |
| `VERIFIED_TUTOR` | Priority queue + planTier 2 + marketed badge | Prefer **Priority Verification Review**; badge only via review |
| `HIGHLIGHTED_AD` | 30-day listing highlight | Map → **Listing Boost** family or deprecate in favour of Boost |
| `AD_BOOST` | 30-day listing boost | Prefer as **Listing Boost** |
| `STUDENT_PASS` / `STUDENT_PRO` | Keep | Align names Free / Pass / Pro (already close) |
| Stripe routes / field names | Legacy | Keep for records; public copy = Safepay only |
| `TutorAd` dual-write | Compatibility | Retain until fully unused |

**Do not delete** subscriptions, payments, profiles, listings, reviews, verification requests, messages, requests, PP purchases, or URLs.

---

## 6. Proposed canonical V2 mapping

### 6.1 Public commercial model

#### Students

| Plan | Entitlements |
|------|----------------|
| **Free** | Search, view, limited contacts (number = TBD approval; live **3**), reply existing, basic study tools, PP per canonical rules (browse; download via Pass/Pro or purchase) |
| **Pass** | Unlimited contacts (per policy), Student Requests, monthly PP allowance |
| **Pro** | Pass + unlimited eligible PP + AI Study Assistant |

#### Tutors

| Plan | Entitlements |
|------|----------------|
| **Free** | 1 master profile; appear in search if eligible; multiple Teaching Listings within **free allowance**; enquiries; 100% lesson fees; normal ranking |
| **Pro** | Paid growth: more listings, priority in relevant search, enhanced enquiry access, analytics. Public name **Tutor Pro**; `TUTOR_BASIC` internal compat |

#### Teaching Listings

- ONE tutor → ONE master profile → MANY listings (`TutorProfile` → `SubjectProfile`).
- **ONE** entitlement function for free/paid caps (extend `subject-profile-entitlements.ts`; kill Extra/Unlimited as separate public products over time).

#### Add-ons (simplified)

- Tutor Free, Tutor Pro  
- Optional **Listing Boost** (map `AD_BOOST`; treat `HIGHLIGHTED_AD` as legacy alias or merge)  
- **Verification** = trust process (not “buy badge”)  
- **Priority Verification Review** if paid SKU retained temporarily (`VERIFIED_TUTOR`)

#### Search / rates / payments

- Search-first; match listings; one tutor once via best matching listing (**done**).  
- Boost subordinate to relevance (**not done**).  
- Listing rate authoritative; profile hourlyRate legacy.  
- Safepay only for MTH subscription/add-ons until separate approval for lesson money.

### 6.2 Suggested entitlement source of truth (implementation target)

```
plan-limits.ts          → usage meters (contacts, reveals, PP downloads)
subject-profile-entitlements.ts → listing caps ONLY
subscription.ts         → plan predicates (Pass, Pro, Tutor Pro, boost SKUs)
marketing-copy.ts       → all public strings (pages import; no hardcoded plan myths)
```

---

## 7. Migration impact (preserve users)

| Asset | Action |
|-------|--------|
| Active `TUTOR_BASIC` / Extra / Unlimited subs | Keep rows; map entitlements to Pro-equivalent caps/reveals/priority |
| `VERIFIED_TUTOR` paid but unverified | Keep Priority Review; **do not** set `verified` |
| Already `verified: true` | Leave untouched |
| Boost/Highlight windows on SubjectProfiles | Honour until expiry |
| Over-cap listings after promo end | Existing `enforceSubjectProfileCap` (pause oldest) — confirm messaging before 1 Oct |
| Student Pass/Pro | No structural change |
| Payment / Stripe-named columns | Keep; no rewrite of historical trackers |
| Public URLs (`/listings/[id]`, tutors, papers) | Preserve |

**No customer emails** in this phase. **No full site redesign.**

---

## 8. Business decisions that require approval (STOP)

Do **not** silently finalize:

1. **Actual prices** (PKR amounts for Free/Pass/Pro/Tutor Pro/Boost).  
2. **Free student contact allowance** (live 3 — confirm or change).  
3. **Final Free / Pro teaching listing limits** (preference: 2 free until 30 Sep 2026, then 0 free / all paid — **FLAG**).  
4. **Commission** (live 0% — confirm forever vs later marketplace fee).  
5. **Lesson custody / payouts** (out of scope until separate approval).  
6. **Refund economics** (7-day rules, boost non-refundability, renewal truth).  
7. **Verification approval standard** (what earns the badge).  
8. **New legal obligations** (Terms/Refund/Privacy rewrite beyond copy accuracy).  
9. **Safepay financial scope** (subscriptions only vs lessons later).

---

## 9. Safe implementation backlog (no price changes)

Ordered for progress without waiting on §8 except where noted:

1. **Copy:** Fix `/become-a-tutor` unlimited-listings claim → align with `TUTOR_FREE_LISTING_LINE`.  
2. **Copy:** Verification = identity review; soften “buy badge” on pricing/plans features; keep Priority Review if SKU remains.  
3. **Copy:** Prefer “Tutor Pro” in new public strings; keep `TUTOR_BASIC` id; optional subtitle “formerly Tutor Basic”.  
4. **Copy:** Listing Boost naming; map Highlight as legacy.  
5. **Entitlements:** Document single cap resolver; avoid new public SKUs for caps.  
6. **Search:** Reweight score so relevance ≫ boost/tier (behaviour change — ship carefully).  
7. **Rates:** Stop requiring profile hourlyRate for listability once listings exist (tech debt).  
8. **Payments copy:** Align auto-renew claims with real Safepay/manual behaviour; reduce Stripe user-facing terms.  
9. **Past papers:** One FAQ / marketing block for browse vs Pass quota vs Pro vs pay-per-paper.  
10. Update **tracker** only — do not declare COMPLETE until done and production-verified.

---

## 10. File inventory audited

| Path | Role |
|------|------|
| `src/lib/plans.ts` | Plan catalogue & promo |
| `src/lib/plan-limits.ts` | Usage gates |
| `src/lib/business-rules.ts` / `marketing-copy.ts` | Intended copy SoT |
| `src/lib/free-vs-paid.ts` | Compare tables |
| `src/lib/subscription.ts` | Predicates, badges sync, tier |
| `src/lib/subject-profile-entitlements.ts` | Listing caps |
| `src/lib/tutor-public-eligibility.ts` | Public visibility |
| `src/lib/search-tutors.ts` / `search-dedupe.ts` | Search + dedupe |
| `src/lib/listing-boost.ts` / `listing-checkout.ts` | Per-listing boost |
| `src/lib/payments-status.ts` / Safepay modules | Checkout live |
| `src/app/pricing`, `free-vs-paid`, `about`, `help`, `terms`, `refund`, `privacy` | Legal/marketing |
| `src/app/become-a-tutor`, `(home)`, dashboards | Acquisition / UX |
| `docs/MTH-MARKETPLACE-V2-TRACKER.md` | Implementation tracker |

---

## 11. Verdict for Phase 2

**No §8 decision blocks** fixing contradictions, verification wording, Boost naming preference, or documenting Pro aliases — **as long as prices and numeric limits are not changed**.

**Blocked without approval:** new prices, changing the 3-contact free allowance, changing the 2→0 listing schedule, commission, lesson payments, refund economics, verification standards, Safepay scope expansion.

**Next immediate technical fixes:** become-a-tutor copy; verification / Boost public wording; tracker commercial section; optional search relevance reweight as a careful follow-up.
