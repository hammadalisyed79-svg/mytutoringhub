# Recovery Email 1 — Admin Send Action Report

**Date:** 2026-08-23  
**Commit:** (see `git log -1` after deploy)

---

## Summary

Added a **two-step admin control** on `/admin/tutor-supply` to send Recovery Email 1 (`tutor_profile_r1`) to the current canonical recovery audience. No emails were sent during development or deployment verification.

---

## Files changed

| File | Purpose |
| --- | --- |
| `src/lib/tutor-recovery-send.ts` | Preview + send orchestration; re-runs eligibility; duplicate-safe |
| `src/components/AdminRecoveryEmail1Panel.tsx` | Button → confirmation → result summary (client) |
| `src/app/admin/tutor-supply/page.tsx` | Embeds send panel on existing campaign preview |
| `src/lib/admin-actions.ts` | `send_recovery_email_1` action (requires `confirmSend: true`) |
| `src/app/globals.css` | Minimal panel spacing |
| `src/lib/tutor-recovery-send.test.ts` | Unit tests |
| `docs/chatgpt-recovery-send-action-report.md` | This report |

---

## Authorization

- **Page:** `admin/layout.tsx` — `role === "ADMIN"` or redirect.
- **API:** `POST /api/admin` — `requireAdmin()` returns 403 if not admin.
- **Action:** `send_recovery_email_1` only runs when `confirmSend: true` is posted.
- No new public/unauthenticated endpoint.

---

## Eligibility recheck

At send time, `sendRecoveryEmail1Campaign()` calls `selectTutorRecoveryAudience()` again (canonical rules unchanged). Per-recipient `sendTutorProfileReminderEmail(userId, 1)` re-validates tutor state before send.

Anyone who became live, complete, suspicious, suspended, or otherwise ineligible between page load and confirm is counted under **Became ineligible**.

---

## Duplicate protection

1. Pre-query `emailSequenceEvent` for `tutor_profile_r1` on current audience user ids.
2. `sendTutorProfileReminderEmail` uses `claimEmailEvent` (unique `userId` + `sequence`).
3. Safe to click confirm twice — second run increments **Already received Email 1**.

---

## Nurture history integration

Successful sends use existing `sendTutorProfileReminderEmail` → `claimEmailEvent` + `tutor_profile_r1` sequence. Visible on:

- `/admin/nurture?profile=1`
- Filter `?sequence=tutor_profile_r1`

Email 2/3 remain on existing cron timing (`tutor_profile_r2` / `tutor_profile_r3`).

---

## Tests

| Test | Result |
| --- | --- |
| `npx tsx src/lib/tutor-recovery-send.test.ts` | Pass |
| `npx tsx src/lib/tutor-recovery-audience.test.ts` | Pass (exclusions) |
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |

Covered: confirm required; outcome classification (sent / already / ineligible / failed). Unauthorized admin API access is enforced by existing `requireAdmin` (403).

---

## Production deployment status

Deployed to `origin/main`. `/admin/tutor-supply` shows:

**Send Email 1 to {N} eligible tutors** → confirmation panel → **Confirm and send Email 1**.

---

## Emails sent during development

**ZERO** real recovery emails were sent during implementation or automated verification.

- Local/dev: `emailConfigured()` is false without `RESEND_API_KEY` — send throws if attempted without config.
- **Production send was NOT executed** by this task — campaign remains **NOT SENT** until an admin manually confirms on production.

---

## Admin launch steps (manual)

1. Open `/admin/tutor-supply`.
2. Review campaign preview counts and Email 1 subject/body.
3. Click **Send Email 1 to N eligible tutors**.
4. Review exclusions on the confirmation step.
5. Click **Confirm and send Email 1**.
6. Verify summary counts; check `/admin/nurture?profile=1` for `tutor_profile_r1` events.
