# MTH — 100% Launch Readiness Tracker

**Live:** https://www.mytutoringhub.com  
**Branch:** `main`  
**Started:** 2026-08-29

Legend: `[ ]` pending · `[~]` in progress · `[x]` done · `STOP` blocked externally

---

## 1. Docs & inventory

- [x] `MTH-100-PERCENT-READINESS-AUDIT.md` (route inventory + findings)
- [x] `MTH-100-PERCENT-READINESS-TRACKER.md` (this file)
- [x] `MTH-HUMAN-UAT-CHECKLIST.md`
- [ ] `MTH-100-PERCENT-READINESS-FINAL-REPORT.md` (after closure)

## 2. Live crawl

- [~] Public marketing / legal / pricing / search / PP / SEO
- [ ] Authenticated surfaces (owner credentials)
- [ ] Classify every meaningful route: PASS | FIXED | REQUIRES HUMAN CHECK | LEGAL STOP | SAFEPAY STOP

## 3. Legacy public commercial copy

- [x] Prior: Tutor Basic → Tutor Pro public copy sweep + SiteSettings remap
- [ ] Remove `(Internal plan id: Tutor Basic.)` from public plan description
- [ ] Hub Points: drop Unlimited Profiles / Highlighted profile sell cards
- [ ] Tutor dashboard: remove Highlighted Listing public SubscribeButton (Listing Boost only)
- [ ] Admin plans copy: Ad Boost → Listing Boost
- [ ] Safepay authority letter: Tutor Basic → Tutor Pro
- [ ] README plan names
- [ ] Hub Points email “wallet” → Hub Points
- [ ] Re-grep repo; classify remaining as internal-required | historical docs only

## 4. Tutor data readiness

- [x] Prior: improve-listing tips (no invented board/qual/syllabus)
- [ ] Confirm tips still prompt applicable taxonomy without hard-requiring N/A fields

## 5–12. Product surfaces (fix confirmed defects only)

- [x] Prior Q&T: quality scores, city order, block/report, PP session normalize
- [ ] Quality scores smoke (production + tests)
- [ ] Search relevance smoke (no rewrite)
- [ ] Past Papers residual REVIEW (~4021) — dry-run high-confidence only
- [ ] PP → tutor funnel no dead ends
- [ ] Registration funnels (code review + human UAT)
- [ ] Contact/messaging entitlements + block/report
- [ ] Reviews readiness (no fabricated stats)
- [ ] Verification flow (Priority ≠ badge)
- [ ] Trust/safety authz

## 13. Safeguarding

- [x] Do not publish requirements as live policy
- [x] Site does not falsely claim final safeguarding policy
- [ ] Closure: LEGAL ACTION REQUIRED for Child Safety policy

## 14–26. Cross-cutting

- [ ] Trust claim audit (no vanity stats)
- [ ] Pricing consistency + currency smoke
- [ ] Mobile / a11y / perf / security spot checks
- [ ] Emails copy consistency
- [ ] Empty states
- [ ] SEO (sitemap, robots, canonicals)
- [ ] Analytics funnel reuse (existing admin)
- [ ] Admin readiness notes
- [ ] DB integrity non-destructive spot check

## 27. Tests

- [ ] `tsc` / typecheck if available
- [ ] Quality / search / entitlements / V2 regressions
- [ ] Do not weaken tests to green

## 28–29. Human + KPI

- [x] Human UAT checklist (~15 items)
- [ ] KPI via existing admin only (no new analytics platform)

## 31. Remaining classification (A/B/C/D only)

| Bucket | Count | Notes |
|--------|-------|-------|
| A FIXED | — | Updated at closure |
| B HUMAN OPERATION | — | |
| C LEGAL/POLICY | — | |
| D SAFEPAY | — | |

## 33. Declaration

- [ ] **MTH — 100% TECHNICAL & COMMERCIAL LAUNCH READINESS ACHIEVED**
- [ ] External remaining listed; STOP DEVELOPMENT

---

## Commit log (this engagement)

| Commit | Summary |
|--------|---------|
| (pending) | Audit/tracker/UAT docs |
| (pending) | Legacy public copy closure |
