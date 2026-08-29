# MTH Quality & Trust — Implementation Report

**Date:** 2026-08-29  
**Branch:** `main`  
**Live:** https://www.mytutoringhub.com  
**Audit:** [MTH-QUALITY-TRUST-AUDIT.md](./MTH-QUALITY-TRUST-AUDIT.md)  
**Tracker:** [MTH-QUALITY-TRUST-TRACKER.md](./MTH-QUALITY-TRUST-TRACKER.md)

## Verdict (this cut)

**Implementation shipped + production DB session normalize applied.**  
**Full “PRODUCTION VERIFIED COMPLETE” declaration** follows live deploy smoke in the progress log below / next commit once Vercel aliases the build.

Marketplace V2 commercial model: **unchanged**.

---

## Shipped

### Past Papers
- Quality classifier + high-confidence session normalizer (board-safe: UK `june`→`June`, not Cambridge `May/Jun`).
- **Applied on production:** **12,758** sessions normalized; originals in `sessionRaw`.
- Remaining REVIEW: ~4,021 missing session; Other docs unchanged (no blind rewrite).
- Admin `/admin/past-papers/quality` dashboard.
- Access UI labels: Included / Available with plan / Individually purchasable / Unavailable.
- Session filters include January / June / October / November.

### Search
- Curated city order preserved for search suggestions (fixes Rawalpindi empty-suggest catalog defect).
- Benchmark dataset + regression (`search-benchmark` + `search-smart` green).
- Boost ≪ academic relevance asserted in tests.

### Tutor quality
- Explainable Strong / Good / Needs improvement score + tips in listings manager.
- High-confidence near-duplicate listing block on create (GCSE vs A Level allowed).

### Trust & safety
- Structured Report categories → admin queue.
- Block User API + profile control; messaging respects blocks.
- Safeguarding requirements doc (LEGAL REVIEW — not published policy).

### Reviews
- Schema default `PENDING`; optional one tutor response API.
- Badge criteria documented; empty state already “No reviews yet”.

### Public copy
- Stale public/email/admin-display “Tutor Basic” → **Tutor Pro** (internal plan id retained).

### Tests
- `npm run test:quality` (normalize, listing quality, search benchmark, search-smart).
- V2 regressions: marketplace-p0, seo-indexation, verification-queue, subject-profile-entitlements.

---

## Production data safety

| Action | Mode | Result |
|--------|------|--------|
| Session normalize | Dry-run then apply | 12,758 updates; `sessionRaw` preserved |
| Mass delete | Not done | — |
| Price / entitlement changes | Not done | — |

---

## Deferred / STOP

| Item | Status |
|------|--------|
| Published safeguarding policy | **STOP** — legal (`MTH-SAFEGUARDING-POLICY-REQUIREMENTS.md`) |
| Review-removal legal disputes | STOP |
| Minimum age / parental consent public rule | STOP |
| Lesson booking / escrow / V3 / new paid products | Excluded |
| Improve-with-AI listing rewrite | Deferred (no infra) |
| Auto recruitment emails | Excluded |
| Backfill board/syllabus on 74 ACTIVE listings | Tutor action + tips; no silent rewrite |

---

## Live smoke checklist (post-deploy)

- [ ] `/` Tutor Pro copy
- [ ] `/search?subject=Mathematics&country=Pakistan`
- [ ] `/past-papers` session filters + access labels
- [ ] Tutor profile Report + Block (signed-in)
- [ ] `/admin/past-papers/quality` (admin)
