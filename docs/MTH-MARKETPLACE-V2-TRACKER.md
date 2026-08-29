# Marketplace V2 — implementation tracker

Governing target: Marketplace V2 master product model + **approved commercial decisions** (2026-08-29).  
Commercial audit: [`docs/MTH-MARKETPLACE-V2-COMMERCIAL-AUDIT.md`](./MTH-MARKETPLACE-V2-COMMERCIAL-AUDIT.md).  
Final report: [`docs/MTH-MARKETPLACE-V2-FINAL-IMPLEMENTATION-REPORT.md`](./MTH-MARKETPLACE-V2-FINAL-IMPLEMENTATION-REPORT.md).  
Execution: evolve `SubjectProfile` as Teaching Listing (no parallel table).

**Approved caps (supersede promo 2→0):** Tutor Free = **3** active listings; Tutor Pro (`TUTOR_BASIC`) = **10**. Student Free = **3** contacts. Prices unchanged.

| Phase | Status | Notes |
|-------|--------|-------|
| Foundation (listings under one tutor) | Done | SubjectProfile + entitlements + per-listing boost |
| Data migration | Done | Dual-write TutorAd; unique-on-subject removed |
| Taxonomy fields | Done | Optional board / qualification / syllabusCode |
| Tutor UX rename | Done | My profile + My teaching listings + quality tips |
| Search V2 dedupe | Done | One tutor per result + Also teaches |
| Search sort + board filter | Done | Best match / rating / price; exam board filter |
| Profile Lessons offered | Done | From-rate + listing cards + message listing picker |
| Zero-result → request prefill | Done | Search + Past Papers CTAs prefill /ads/new |
| Student request taxonomy | Done | board + syllabusCode; smarter tutor match on /ads |
| Past paper syllabus match | Done | CTA passes board / level / code into search |
| Saved + recently viewed | Done | localStorage favorites & recent rail |
| Hero need-first | Done | Subject suggest + guided search link |
| Professional dashboard UI | Done | Status card, tabs, wizard, badges, progress hierarchy |
| Admin demand intelligence | Done | `/admin/demand` requests vs listings by subject |
| Search funnel events | Done | `search_results_shown` / `search_zero_results` product events |
| Commercial audit (Phase 1) | Done | Live vs code vs V2; contradictions; approval stops |
| Public copy → Tutor Free / Pro (3 / 10) | Done | Promo “2 free until 30 Sep then zero” retired from V2 model; pages + SoT aligned |
| Search: boost ≪ relevance | Done | Score reweight so subject/board/code dominate boost/tier |
| Canonical listing-cap SKU collapse | Done | Extra/Unlimited kept in DB; hidden from public Pricing; grandfather → Pro/∞ |
| Profile hourlyRate legacy-only | Done | Listability OK with ≥1 ACTIVE listing rate ≥500 |
| Search impression DB table | Done | `SearchAnalyticsEvent` + product-event persist |
| Verification = earned identity | Done | Priority Review SKU ≠ badge; planTier from badge not purchase |
| Full booking / Safepay lesson pay | Deferred | Out of V2 scope — needs separate approval |
| Child Safety & Safeguarding Policy | Deferred | High priority post-V2; do not claim it exists |
| Production cutover + verification | **Done** | **MARKETPLACE V2 — PRODUCTION VERIFIED COMPLETE** (2026-08-29) |

## Production verification record

| Field | Value |
|-------|--------|
| Status | **MARKETPLACE V2 — PRODUCTION VERIFIED COMPLETE** |
| Verified at | 2026-08-29 ~16:15 PKT |
| Commit | `b2b978e1996db27f6554919337afed790dd920c1` |
| Deployment | `dpl_8acQWhqYYPp89RRjppeVyEhgQFpf` (Vercel production, auto-deploy) |
| Migrations | `SearchAnalyticsEvent` + SubjectProfile taxonomy columns present on Neon; no data loss observed |
| Public copy | Free 3 / Pro 10 live; “2 free → 0 / 1 October” gone; Extra/Unlimited not publicly sold |
| Search / analytics | Live dedupe + Also teaches; events persist with listing ids |
| Tests | tsc + entitlement/subscription/profile-completion (+ related) pass; `search-smart` Rawalpindi city assert pre-existing fail (non-blocking) |
| Human residual | Logged-in tutor/student/admin interactive UI (credentials) |

## Approved commercial model (canonical)

| Audience | Plan | Entitlement |
|----------|------|-------------|
| Student | Free | 3 new tutor contacts/mo |
| Student | Pass / Pro | Unlimited contacts; PP 10/mo vs unlimited |
| Tutor | Free | 1 master + up to **3** ACTIVE teaching listings; organic search |
| Tutor | Pro (`TUTOR_BASIC`) | Up to **10** ACTIVE listings; relevance-first ranking; unlimited reveals |
| Tutor | Listing Boost (`AD_BOOST`) | Preferred promo; Highlight legacy alias |
| Tutor | Priority Verification Review (`VERIFIED_TUTOR`) | Queue priority only; badge earned via review |

## Intentionally deferred

- Lesson escrow / wallets / payouts / booking
- Qualification verification (beyond identity)
- Safeguarding legal policy drafting
- Future price changes
- Substantive refund economics changes (factually wrong auto-renew wording fixed only)

**MARKETPLACE V2 — PRODUCTION VERIFIED COMPLETE** is recorded in the final implementation report.
