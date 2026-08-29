# MTH — Human UAT Checklist (Owner)

**Purpose:** ~15 high-value **signed-in** checks that agents cannot fully verify without owner credentials.  
**Live:** https://www.mytutoringhub.com  
**When:** After technical readiness declaration / production deploy of this engagement.

Mark each: **PASS** / **FAIL** / **N/A** with date and initials.

---

## Account & onboarding

1. [ ] **Register as student** — email verification arrives; complete onboarding; land on student dashboard.
2. [ ] **Register as tutor** — email verification; complete profile; teaching listings tab usable; Improve-your-listing tips visible without forcing N/A taxonomy.

## Marketplace & messaging

3. [ ] **Search → message tutor** — Free student contact entitlement decrements correctly; limit messaging is clear when exhausted.
4. [ ] **Block user** — From tutor profile, block; messaging blocked both ways; unblock or confirm persistence as designed.
5. [ ] **Report user** — Submit a structured report; appears in `/admin/reports` (or admin queue).

## Tutor commercial surfaces

6. [ ] **Teaching listings** — Create/edit/publish listing; quality badge (Strong/Good/Needs improvement) shows; near-dupe warning if duplicate.
7. [ ] **Listing Boost only** — Active listing shows Listing Boost CTA; **no** “Highlighted Listing” purchase button.
8. [ ] **Plans** — `/pricing` and tutor plan tab show Tutor Pro / Priority Verification Review / Listing Boost; no Tutor Basic / Ad Boost / Verified Tutor as product titles.

## Verification & trust

9. [ ] **ID verification upload** — Submit ID from dashboard; status updates; badge only after admin approve (not after paying Priority Review alone).
10. [ ] **Admin verification queue** — Approve/reject one request; Identity Verified badge updates on public profile.

## Past papers & funnel

11. [ ] **Admin PP quality** — `/admin/past-papers/quality` loads; residual empty sessions understandable; no mass-delete without dry-run review.
12. [ ] **PP → tutor** — From a past-paper subject page, “Find a tutor” (or equivalent) lands on search with useful filters; no 404/dead end.

## Payments (status-aware)

13. [ ] **Checkout CTA** — Matches real Safepay status (live checkout **or** activate-after-payment / contact). Do not force a live charge if Safepay not ready.
14. [ ] **Receipt / subscription grant** — After a real or manual activation, plan entitlements appear on dashboard.

## Admin ops

15. [ ] **Admin smoke** — `/admin` demand/revenue/reviews/users reachable; grant legacy SKU only intentionally; KPI views usable without a new analytics tool.

---

## Optional extras (if time)

- [ ] Student “need a tutor” ad create + tutor reply path  
- [ ] Mobile viewport: search filters + message composer  
- [ ] Password reset end-to-end  

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Owner | | | |
| Notes | | | |
