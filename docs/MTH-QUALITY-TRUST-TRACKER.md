# MTH Quality & Trust — Tracker

**Started:** 2026-08-29  
**Live:** https://www.mytutoringhub.com  
**Audit:** [MTH-QUALITY-TRUST-AUDIT.md](./MTH-QUALITY-TRUST-AUDIT.md)  
**Rule:** One tracker. No per-module “final reports”. Marketplace V2 commercial model locked.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[D]` deferred · `[S]` STOP (needs approval)

---

## Audit

- [x] Production + DB inventory (2026-08-29)
- [x] Quantify PP session / Other / missing-file false positives
- [x] Search / listings / reviews / safety / copy / SEO scan
- [x] Write audit doc
- [x] Confirm no commercial/legal STOP for engineering work

---

## Past Papers

- [x] Session normalizer (high-confidence maps) + classify CLEAN / AUTO / REVIEW / BROKEN
- [x] Preserve originals (`sessionRaw`) on normalize
- [x] Dry-run script with counts + preview (no blind bulk mutate)
- [x] Apply auto-fix after dry-run review (**12,758** rows)
- [x] Admin quality surface (totals, clean, normalized, review, Other, missing meta)
- [x] Access UI labels: Included / Available with plan / Individually purchasable / Unavailable
- [x] Grade-threshold label in DOCUMENT_TYPE_LABELS
- [D] Mass rebuild / URL changes / deletes — excluded

---

## Search Quality

- [x] Preserve curated city order for search suggestions (Rawalpindi catalog defect)
- [x] Repeatable benchmark dataset
- [x] Benchmark reporter + regression for important cases
- [x] Confirm boost never rescues irrelevant (regression asserts)
- [x] Zero-result path already present (V2); left intact
- [D] Full search rewrite — excluded

---

## Tutor Quality

- [x] Explainable listing quality score (Strong / Good / Needs improvement) + tips
- [x] Show score in tutor listings manager (no silent rewrite)
- [x] Near-dupe warn then block (high confidence); allow GCSE vs A Level
- [D] Mass deactivate weak copy
- [D] Improve with AI (no infra assumed)

---

## Trust & Safety

- [x] Structured Report User categories → admin records
- [x] Block User (peer block) + respect in messaging
- [x] Admin safety queue shows category
- [x] Write `docs/MTH-SAFEGUARDING-POLICY-REQUIREMENTS.md` (LEGAL/POLICY REVIEW REQUIRED)
- [S] Final published safeguarding policy — STOP for legal

---

## Reviews

- [x] Align Review schema default with PENDING moderation
- [x] Optional one tutor response API
- [x] Keep “No reviews yet”; never “5.0 (0 reviews)”
- [x] Document badge criteria (`MTH-REVIEW-BADGE-CRITERIA.md`)
- [D] Verified-lesson reviews (no lesson booking product)

---

## Public Copy

- [x] Replace public/student/tutor/email “Tutor Basic” → Tutor Pro (keep internal plan id)
- [x] Admin display labels → Tutor Pro where user-facing
- [x] Trust strip truth check (no fake claims)

---

## Admin

- [x] Past paper quality dashboard
- [x] Listing taxonomy completeness metric on PP quality page
- [x] Safety queue shows report category

---

## Demand Intelligence

- [x] Existing admin demand retained (no auto emails)
- [D] Auto emails to tutors — excluded

---

## Conversion

- [x] PP access labels clarified
- [D] Cosmetic redesign / homepage overhaul

---

## Performance / Security

- [x] PP download path unchanged; schema additive only
- [x] No secrets in commits; named files only

---

## SEO

- [x] Preserve noindex / ratings rules (regression green)

---

## Testing

- [x] PP normalize unit tests
- [x] Search city order + Rawalpindi + benchmark regression
- [x] Listing quality score tests
- [x] V2 commercial regression still green
- [ ] Signed-in Report/Block browser residual

---

## Production Verification

- [~] Deploy from `main` + live smoke
- [x] DB dry-run + apply normalize counts recorded
- [ ] Declare **MTH MARKETPLACE QUALITY & TRUST — PRODUCTION VERIFIED COMPLETE** after live smoke
- [x] Final report draft: `docs/MTH-QUALITY-TRUST-FINAL-IMPLEMENTATION-REPORT.md`

---

## Progress log

| When | Note |
|------|------|
| 2026-08-29 | Phase 0 audit complete against live Neon + www. |
| 2026-08-29 | Modules 1–12 engineering: normalize applied (12,758), search city order, quality score, report/block, Tutor Pro copy, tests green. |
