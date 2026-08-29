# MTH Quality & Trust — Production Audit

**Audit date:** 2026-08-29 (~16:55 PKT)  
**Authority:** Live production DB (Neon via `DATABASE_URL_UNPOOLED`) + https://www.mytutoringhub.com  
**Repo:** `main` @ audit start `67643c0` (Marketplace V2 production verified complete)  
**Constraint:** Marketplace V2 commercial model **unchanged** — this engagement is quality/trust only.

---

## Executive summary

Production Marketplace V2 is intact. Highest-impact quality gaps are: **past-paper session label fragmentation** (~13k auto-fixable rows), **100% of ACTIVE listings missing board/syllabus/qualification** (taxonomy unused), **stale “Tutor Basic” copy** on student/tutor/email surfaces, **no peer Block User**, and **city suggestion order** alphabetizing away curated majors (e.g. Rawalpindi). Reviews and reports are empty but pipelines exist. No commercial STOP triggered.

---

## Inventory counts (production DB)

| Entity | Count | Notes |
|--------|------:|-------|
| Users | 39 | |
| TutorProfile | 31 | Verified **10** |
| Tutors with ≥1 ACTIVE listing | 16 | Homepage shows **13** “Active tutors” (public eligibility filter) |
| SubjectProfile | 103 | ACTIVE **74** |
| Review | 0 | PENDING 0 / PUBLISHED 0 |
| TutorRecommendation | 2 | APPROVED 2 |
| Report | 0 | OPEN 0 |
| VerificationRequest | 6 | PENDING 0 |
| StudentRequest | 0 | |
| StudentAd | 2 | |
| Message | 1 | |
| Subscription | 23 | |
| PastPaper | **29,694** | All `isActive` + `published` + `isPublic` |
| PastPaper storage | **29,694** R2 `storageKey` | `fileUrl` null (expected — R2 path) |
| PastPaperPurchase | 1 | |
| SearchAnalyticsEvent | 15 | shown 13 / zero_results 2 |

---

## 1. Past Papers data quality

### What’s healthy
- Full R2-backed catalog live (homepage **29,694** papers).
- Canonical paperType mostly clean: Question paper **11,646**, Marking scheme **11,044**, Examiner report **474**, Insert **303**.
- documentType populated for all rows; no null documentType.
- No mass-delete needed; URLs/catalog keys must be preserved.

### Quantified problems

| Issue | Count | Class |
|-------|------:|-------|
| Session variants needing normalize (`june`, `may-june`, `oct-nov`, `november`, `january`, `october`, `feb-march`, …) | ~**12,358** | **AUTO-FIXABLE** (high confidence maps) |
| Session null/empty | **4,021** | **REVIEW REQUIRED** |
| Session already canonical (`May/Jun`, `Oct/Nov`, `Feb/Mar`) | ~**12,915** | **CLEAN** |
| paperType / documentType `Other` / `OTHER` | **6,227** / **6,150** | Mostly grade thresholds / CI — **REVIEW** (label improve) / some **AUTO** to Grade threshold |
| Missing `storageKey` | **0** | CLEAN (false alarm if counting null `fileUrl` alone) |
| Subject = Other | **0** | CLEAN |
| Dual catalog framing (synthetic 2016–2025 pairs vs R2 rows) | Admin UX | Copy/clarity — do not rebuild |

### Session distribution (top)

| session | count |
|---------|------:|
| june | 6015 |
| May/Jun | 5680 |
| Oct/Nov | 5651 |
| november | 1933 |
| oct-nov | 1612 |
| Feb/Mar | 1584 |
| may-june | 1397 |
| january | 906 |
| october | 544 |
| feb-march | 351 |
| null | 3928 |
| "" | 93 |

### Access / entitlements UI
- Buy/download CTA is price-centric (`View / Download · {fee}`); does **not** clearly label **Included / Available with plan / Individually purchasable / Unavailable**.
- Entitlements themselves (Pass 10/mo, Pro unlimited, pay-per-paper) are correct — **no price changes**.

### Recommended actions (Module 1)
1. Deterministic session normalizer + dry-run counts + preserve `sessionRaw`.
2. Admin quality dashboard (totals, clean, normalized, review, broken, Other, missing meta).
3. Clarify download access labels without changing fees.

---

## 2. Search relevance

### Live smoke
- `/search?subject=Mathematics&country=Pakistan` → results; soft sparse nudge; Also teaches present.
- Zero-result path + Student Request prefill verified in V2 cutover; analytics types present.

### Ranking
- Relevance weights already ≫ boost (subject/syllabus/board ≫ boost×8). Do **not** rewrite search.

### Rawalpindi assertion
- Rawalpindi **is** in `MARKET_CITIES_BY_COUNTRY_CODE.PK` (position 4).
- `citiesForCountry` / `citiesForSearchCountry` run through **alphabetical** `uniqueSorted`, so empty `suggestCities("", 20)` drops Rawalpindi.
- **Real catalog defect:** curated market order destroyed for search suggestions. Fix order preservation — not “just change the test”.

### Listing taxonomy gap (search quality)
- **74 / 74** ACTIVE listings have **null board, qualification, and syllabusCode**.
- Search cannot use board/syllabus scoring on real inventory → weaker academic relevance vs Past Paper deep-links.

### Benchmark
- No repeatable benchmark dataset/regression harness yet (Module 2).

---

## 3. Tutor / listing quality

| Signal | Finding |
|--------|---------|
| Quality score | Soft tips only in `TutorAdsManager` — no Strong/Good/Needs improvement score |
| Copy quality | Weak/generic descriptions common (“New tutor — update…”, typos, shared headline across subjects) |
| Duplicate abuse | Exact-match duplicate guard on create (subject+level+board); no near-dupe / warn→block |
| Mass deactivate | Not present (keep this way) |
| Improve with AI | Not implemented; optional only if infra exists |

---

## 4. Trust & safety

| Feature | Status |
|---------|--------|
| Report User | Free-text reason only; admin queue resolves/suspends |
| Structured report categories | Missing |
| Block User | **Not implemented** |
| Suspend | Admin via reports |
| Safeguarding public policy | **Deferred / not published** — write requirements doc only |

Prod reports = 0 → pipeline unexercised but intact.

---

## 5. Reviews & reputation

| Item | Finding |
|------|---------|
| Reviews in prod | **0** |
| Display empty state | Correct: “No reviews yet” (not “5.0 (0 reviews)”) |
| API vs schema | Creates `PENDING`; schema default still `PUBLISHED` |
| Tutor response | Not present |
| Badges | Evidence thresholds in `tutor-badges.ts` — keep documented |

---

## 6. Trust public copy

| Surface | Status |
|---------|--------|
| Homepage / pricing / help / about / terms | Mostly **Tutor Pro** ✓ |
| Emails (`email.ts`, nurture) | Stale **Tutor Basic** |
| Messages, ads browse, contact, tutor analytics | Stale **Tutor Basic** |
| Admin labels | Internal id `TUTOR_BASIC` OK; display should say Tutor Pro |
| Hub Points titles | Stale **Tutor Basic** |

Trust strip on homepage (verification / currency / no commission / bank transfer / 50+ countries) is truthful enough; keep no fake claims.

---

## 7–8. Admin quality + demand intelligence

- Admin nav already has Demand, Tutor supply, Reports, Verifications, Reviews, Past papers.
- Past papers admin lacks quality classification totals.
- Demand intelligence exists — do not add auto emails.

---

## 9. Conversion dead ends

- Sparse search nudge + post requirement CTA present.
- Past paper access labels unclear (see §1) — conversion clarity, not redesign.
- No major homepage redesign in scope.

---

## 10–11. Performance / security / SEO

| Area | Finding |
|------|---------|
| SEO indexation | Filtered/thin pages noindex; ratings JSON-LD only if reviews > 0 |
| Sitemap/robots | Present; admin/dashboard disallowed |
| PP downloads | Signed R2; host allowlist; watermark at download |
| Privacy | No new public legal obligations in this engagement |

---

## Taxonomy consistency

- `curriculum.json` 1,211 codes power PP + listing boards.
- Subject alias drift: past-paper extra `Islamiyat` vs search `Islamic Studies`.
- City lists: market-locations curated order vs alpha sort in tutor-catalog (defect).

---

## STOP gate check

No change requested to: prices, Free/Pro entitlements, commission, Safepay scope, lesson custody, legal verification standard, age/consent, published safeguarding text, review-removal law, new paid products.  
**Proceed with engineering Modules 1–14.**

---

## Deferred / excluded (intentional)

- Lesson booking, calendar, video classroom, escrow/wallet, managed lesson payments, mobile app, academy accounts, new subscription tiers, new ad products, Marketplace V3, social features.
- Final published safeguarding policy (legal review).
- Mass auto-deactivate of weak listings; silent AI rewrite of tutor copy.
