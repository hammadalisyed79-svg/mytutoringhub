# Marketplace V2 — implementation tracker

Governing target: Marketplace V2 master product model.
Execution: evolve `SubjectProfile` as Teaching Listing (no parallel table).

| Phase | Status | Notes |
|-------|--------|-------|
| Foundation (listings under one tutor) | Done | SubjectProfile + entitlements + per-listing boost |
| Data migration | Done | Dual-write TutorAd; unique-on-subject removed |
| Taxonomy fields | Done | Optional board / qualification / syllabusCode |
| Tutor UX rename | Done | My profile + My teaching listings |
| Search V2 dedupe | Done | One tutor per result + Also teaches |
| Profile Lessons offered | Done | From-rate + listing cards |
| Zero-result → request prefill | In progress | Search CTA prefill; NewAdForm initials |
| Student request shared taxonomy | Later | |
| Past paper syllabus match | Later | CTA still subject-string |
| Admin demand intelligence | Later | |
| Full booking / Safepay lesson pay | Deferred | Out of V2 scope |

Do not declare **MARKETPLACE V2 IMPLEMENTATION COMPLETE** until remaining Later items are done, tested, and production-verified.
