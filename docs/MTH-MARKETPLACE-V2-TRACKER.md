# Marketplace V2 — implementation tracker

Governing target: Marketplace V2 master product model.
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
| Admin demand intelligence | Later | Aggregate search / zero-result insights |
| Search impressions analytics | Later | Event table + instrument search cards |
| Full booking / Safepay lesson pay | Deferred | Out of V2 scope |

Do not declare **MARKETPLACE V2 IMPLEMENTATION COMPLETE** until remaining Later items are done, tested, and production-verified.
