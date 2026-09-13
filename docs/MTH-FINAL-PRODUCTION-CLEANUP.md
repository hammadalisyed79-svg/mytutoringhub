# MTH Final Production Cleanup

Date: 2026-09-14  
Repo: `C:\Tutor` · branch `main`

## Checklist

| Area | Result |
|------|--------|
| Commercial consistency | **PASS** |
| Search relevance (Science ≠ Computer Science) | **PASS** |
| Similar Teaching Profiles | **PASS** |
| Priority Verification price (PKR 2,999) | **PASS** |
| Payment / renewal wording | **PASS** |
| Safepay lesson-payment isolation | **PASS** |
| Subjects SEO (SSR) | **PASS** |
| Tests / production build | **PASS** |

## What changed

- Locked public commercial copy to Student Free/Pass/Pro and Tutor Free/Pro + Listing Boost + Priority Verification Review + Past Paper PKR 100.
- Removed Extra Active / Hub Points / Tutor Basic / Profile Boost from **new public sales** surfaces (including pricing hero bullets); legacy entitlements and checkout IDs preserved for grandfathering.
- Search matching uses canonical subject identity only (no substring Science→Computer Science).
- Similar profiles: same subject → broader location → labelled generic nearby.
- Terms / Refund / Help / checkout footer: access for purchased period; no false auto-renew claim for one-time Hosted Checkout.
- Privacy: removed public “Legal review backlog”; cookie wording no longer claims “no advertising cookies”.
- Internal backlog: `docs/MTH-LEGAL-COMPLIANCE-BACKLOG.md`.

## BWY / MTH identity

- **No BWY** in Terms, Privacy, footer, receipts, Safepay product copy, or env templates.
- Product brand remains **My Tutoring Hub**.
- Correct MTH legal entity is **not invented** here — still requires human/legal confirmation before publishing as merchant/controller.

**MERCHANT / LEGAL IDENTITY BLOCKER:** none found claiming BWY as MTH operator. Remaining action: publish the real MTH entity once counsel confirms it.

## Privacy / legal — still needs human action

See `docs/MTH-LEGAL-COMPLIANCE-BACKLOG.md` (minors, safeguarding, transfers, retention, ID docs, processor disclosures, Past Paper licensing, cookie/ads consent if GA4/Ads live, legal entity).

## Past Paper integrity (read-only)

- Total rows: **29,694**
- Blank board / subject / qualification: **0**
- Null syllabus code: **16,669**; blank syllabus string: **93** (common for boards without codes — review, not auto-fixed)
- Science subject + CS syllabus codes (0478/9618/0984/2210): **0**
- Board field equal to a subject name: **0**
- Computer Science vs Combined Science label conflicts: **0**
- No mass data rewrite performed.
- Audit script: `scripts/past-paper-integrity-check.ts`

## Tests / build

- `npm run test:commercial` — ok  
- Search / capabilities / Safepay / analytics / SEO / past-papers / quality — ok  
- `npx tsc --noEmit` — ok  
- `npx next build` — ok  

## Deployment

- Commit + push to `origin/main` after this report.
- Live smoke: https://www.mytutoringhub.com (/, /pricing, /free-vs-paid, /help, /how-it-works, /become-a-tutor, /search, /past-papers, /terms, /refund, /privacy)

## Remaining blockers

- None for product foundation.
- Legal: confirm MTH entity + backlog items above (human/counsel).

---

**MTH PRODUCTION FOUNDATION — READY**
