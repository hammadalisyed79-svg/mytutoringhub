# Marketplace V2 — implementation tracker

Governing target: Marketplace V2 master product model + Commercial Addendum.  
Commercial audit: [`docs/MTH-MARKETPLACE-V2-COMMERCIAL-AUDIT.md`](./MTH-MARKETPLACE-V2-COMMERCIAL-AUDIT.md).  
Execution: evolve `SubjectProfile` as Teaching Listing (no parallel table).

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
| Public copy → Tutor Free / Pro model | In progress | Tutor Pro public name; Listing Boost; verification = review; become-a-tutor unlimited claim fixed |
| Search: boost ≪ relevance | Done | Score reweight so subject/board/code dominate boost/tier |
| Canonical listing-cap SKU collapse | Later | Keep Extra/Unlimited entitlements; stop selling as primary public path pending approval |
| Profile hourlyRate legacy-only | Later | Listability still requires profile rate |
| Search impression DB table | Later | Persist impressions beyond product-event stub |
| Full booking / Safepay lesson pay | Deferred | Out of V2 scope — needs separate approval |

## Approvals still required (do not auto-finalize)

- Prices (PKR)
- Free student contact allowance (live 3)
- Final Free/Pro listing limits (**FLAG:** 2 free until 30 Sep 2026, then all paid)
- Commission, lesson custody/payouts, refund economics
- Verification approval standard
- New legal obligations / Safepay financial scope beyond platform SKUs

Do not declare **MARKETPLACE V2 IMPLEMENTATION COMPLETE** until remaining Later items are done, tested, and production-verified — and commercial approvals above are resolved where they block ship.
