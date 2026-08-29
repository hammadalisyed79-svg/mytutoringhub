# Review & reputation badge criteria (evidence-based)

Internal reference for Marketplace Quality & Trust. Public UI must not invent unverified claims.

| Badge / signal | Criteria (code: `tutor-badges.ts`) | Notes |
|----------------|--------------------------------------|-------|
| New | Default for listed tutors | Not a quality claim |
| Recommended | ≥2 approved external recommendations | Admin-approved `TutorRecommendation` |
| Super | ≥4 external recs + ≥1 published student review | |
| Top | Super thresholds + ≥3 published reviews | |
| Identity Verified | `TutorProfile.verified` after admin review | **Not** sold; Priority Verification Review only jumps the queue |

## Review categories (truthful)

| Type | Status |
|------|--------|
| Student review (`Review`) | Exists; admin-moderated (`PENDING` → `PUBLISHED`) |
| External recommendation | Exists (`TutorRecommendation`) |
| Verified-lesson review | **Deferred** — no lesson booking product |

## Display rules

- Never show “5.0 (0 reviews)”. Use “No reviews yet”.
- Aggregate rating / JSON-LD only when published review count &gt; 0.
- Optional one tutor response per review (`tutorResponse`) — tutor must write it; no invented text.
