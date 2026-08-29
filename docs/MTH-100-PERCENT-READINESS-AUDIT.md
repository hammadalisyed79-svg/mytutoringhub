# MTH — 100% Practical Launch / Commercial Readiness Audit

**Date:** 2026-08-29  
**Branch:** `main`  
**Live:** https://www.mytutoringhub.com  
**Scope:** Close remaining technical / data / UX / copy / SEO / performance / security / conversion defects that can be fixed **without** a new business or legal decision.  
**Out of scope:** Marketplace V3, redesign, new products/tiers, Safepay live capability beyond reflecting real state, price/entitlement changes, published Child Safety policy drafting.

**Prior authority:** Marketplace V2 PRODUCTION VERIFIED COMPLETE; Quality & Trust PRODUCTION VERIFIED COMPLETE.

---

## Commercial model (must keep)

| Rule | Status |
|------|--------|
| Tutor Free ≤3 / Tutor Pro ≤10 listings | KEEP |
| Student Free 3 contacts | KEEP |
| Listing Boost (public); AD_BOOST internal SKU | KEEP |
| Identity Verified earned; Priority Verification Review ≠ badge | KEEP |
| 0% lesson commission; direct lesson payment | KEEP |
| Internal `TUTOR_BASIC` / `AD_BOOST` SKUs | KEEP |

---

## Route inventory

### Classification legend

| Class | Meaning |
|-------|---------|
| **PASS** | Live check OK; no defect found |
| **FIXED** | Defect confirmed and fixed in this engagement |
| **REQUIRES HUMAN CHECK** | Auth / admin / payment / visual residual needing owner login |
| **LEGAL STOP** | Needs legal/policy decision or publication |
| **SAFEPAY STOP** | Depends on Safepay live capability beyond status reflection |

### Marketing / legal / public content

| Route | Class | Notes |
|-------|-------|-------|
| `/` | PASS | Free 3 / Pro 10; trust strip; no retired October listing promo |
| `/about` | PASS | Aligns with V2 model |
| `/become-a-tutor` | PASS | |
| `/contact` | PASS | |
| `/free-vs-paid` | PASS | Legacy Extra/Unlimited as grandfather FAQ only |
| `/help` | PASS | Verified = earned; Priority Review ≠ badge |
| `/how-it-works` | PASS | |
| `/pricing` | PASS / FIXED | Tutor Pro public name; remapped SiteSettings; strip internal Tutor Basic leak from description |
| `/privacy` | PASS | Explicitly does **not** claim published Child Safety policy |
| `/refund` | PASS | No false always-auto-renew; no escrow |
| `/terms` | PASS | |
| `/subjects` | PASS | |
| `/s/[subject]/[[...city]]` | PASS | SEO landings |

### Auth

| Route | Class | Notes |
|-------|-------|-------|
| `/login`, `/register`, `/register/complete` | REQUIRES HUMAN CHECK | Funnel UX signed-in residual |
| `/forgot-password`, `/reset-password`, `/verify-email` | REQUIRES HUMAN CHECK | Email delivery |
| `/invite/tutor` | REQUIRES HUMAN CHECK | |

### Marketplace / search / listings

| Route | Class | Notes |
|-------|-------|-------|
| `/search` | PASS | Listings-based; city order curated (Q&T); zero-result CTAs |
| `/tutors/[id]` | PASS | Lessons offered; From rate; block/report (signed-in residual) |
| `/listings/[id]` | PASS | |
| `/ads` | PASS | |
| `/ads/new` | REQUIRES HUMAN CHECK | Auth-gated |
| `/student-requests` | PASS / REQUIRES HUMAN CHECK | Board public; post/reply auth |

### Past papers

| Route | Class | Notes |
|-------|-------|-------|
| `/past-papers` | PASS | Sessions normalized Jan/Jun/Oct/Nov where applicable |
| `/past-papers/[board]/[qualification]/[subject]` | PASS | PP→tutor search funnel intact |
| Residual empty sessions (~4021) | REQUIRES HUMAN CHECK | Dry-run high-confidence only; no mass-delete |

### Dashboards / messaging

| Route | Class | Notes |
|-------|-------|-------|
| `/dashboard`, `/dashboard/student`, `/dashboard/tutor` | REQUIRES HUMAN CHECK | Quality badge, boost CTAs, messaging |
| `/dashboard/tutor/plan`, `/dashboard/student/plan`, `/settings/plan` | REQUIRES HUMAN CHECK | |
| `/messages`, `/messages/[id]` | REQUIRES HUMAN CHECK | Entitlements + block enforcement |
| `/receipt/[id]`, `/support`, `/assistant` | REQUIRES HUMAN CHECK | |
| `/study/*` | PASS | Public study tools |

### Admin

| Route | Class | Notes |
|-------|-------|-------|
| `/admin/*` | REQUIRES HUMAN CHECK | Plans, verifications, reviews, PP quality, reports, revenue |

---

## Legacy commercial copy audit

| Occurrence | Classification | Action |
|------------|----------------|--------|
| `plans.ts` description `(Internal plan id: Tutor Basic.)` | **public-fixed** | Remove from public description; keep `id: TUTOR_BASIC` |
| `plans.ts` legacy plan **names** Extra/Unlimited/Highlight | **internal-required** | Catalog + grandfather; not on `PUBLIC_ADDON_PLAN_IDS` |
| Hub Points “Unlimited Profiles” / “Highlighted profile” redeem | **public-fixed** | Point to Tutor Pro / Listing Boost / Priority Review only |
| `TutorAdsManager` Highlighted Listing SubscribeButton | **public-fixed** | Remove public sell CTA; Listing Boost only |
| Admin subscription grant labels (Extra/Unlimited/Highlight/Verified Tutor) | **internal-required** | Admin ops for grandfather SKUs; Verified label → Priority Review where selling intent |
| `admin/plans` “Ad Boost” wording | **public-fixed** (admin UX) | Prefer Listing Boost |
| `public/safepay-authority-letter.html` Tutor Basic | **public-fixed** | Tutor Pro |
| `README.md` stale plan names | **public-fixed** | Docs accuracy |
| Historical `docs/MTH-*`, chatgpt reports | **historical docs only** | No runtime impact |
| Email “verified tutor badge” (earned) | **internal-required** / OK | Identity Verified earned — not purchasable claim |
| “View your wallet” Hub Points email | **public-fixed** | Prefer Hub Points wording |
| Complimentary Tutor Pro until 30 Sep 2026 | **KEEP** | Approved promo; not the retired 2→0 listing promo |
| SiteSettings `planPrices` stale names | **database override-fixed** (prior) | Remap + script; prices unchanged |

---

## Trust / safeguarding

| Item | Class |
|------|-------|
| Privacy disclaimer: Child Safety policy **not** claimed as published | PASS |
| `docs/MTH-SAFEGUARDING-POLICY-REQUIREMENTS.md` unpublished | LEGAL STOP — do **not** publish from eng |
| Vanity / fabricated review stats | Audit — no fabricated public stats; Reviews empty is honest |

---

## Technical residuals (safe to fix)

1. Strip public Tutor Basic leak + Hub Points legacy sell + Highlighted Listing CTA.
2. Soft admin/email wording (Ad Boost → Listing Boost; wallet → Hub Points).
3. Verify production SiteSettings display names still remapped.
4. Past-paper empty-session REVIEW — dry-run only if high-confidence script exists.
5. Run test suites; fix real failures only.
6. Public smoke crawl all marketing + search + PP + pricing.

## External / non-engineering

| Bucket | Items |
|--------|-------|
| **C LEGAL/POLICY** | Publish Child Safety & Safeguarding Policy; age/parental consent |
| **D SAFEPAY** | Live paid checkout capability beyond status reflection |
| **B HUMAN OPERATION** | Signed-in UAT (~15 checks); admin PP quality; marketplace population |

---

## Declared stop conditions

Do **not** stop for routine tech defects. Stop only for:

1. Legal safeguarding publication (eng must not invent policy text as live policy).
2. Safepay live capability beyond reflecting real payments-status.
3. Price / entitlement / commission / architecture changes.
