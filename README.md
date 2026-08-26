# MyTutoringHub

FindTutor-style marketplace for **mytutoringhub.com**: students and tutors pay platform subscriptions; lesson fees stay between them.

## Features

- Student Pass, Student Pro, Tutor Basic, and tutor visibility add-ons (Verified, Highlighted, Ad Boost, Unlimited Ads)
- **Safepay** hosted checkout (primary); Stripe remains an optional fallback when Safepay is not configured
- Tutor search with filters, **student requests** board (`/ads`), in-app messaging
- Reviews (after messaging), admin moderation, Resend email hooks
- Free browser-local study tools (progress log, exam countdown); Student Pro unlocks the AI study assistant

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, Prisma + **PostgreSQL**, Auth.js, Safepay, Resend. Stripe SDK/routes remain for fallback only.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set:
   - `DATABASE_URL` / `DATABASE_URL_UNPOOLED` (Postgres)
   - `SAFEPAY_API_KEY`, `SAFEPAY_SECRET_KEY`, `SAFEPAY_ENV` (sandbox or production)
   - `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`
   - Optional: Resend, OAuth, Stripe fallback price IDs, R2/Blob for past papers
3. Initialize DB:

```bash
npx prisma db push
npx tsx prisma/seed.ts
```

4. Run: `npm run dev` → http://localhost:3000

### Seed accounts

| Role    | Email                         | Password       |
|---------|-------------------------------|----------------|
| Admin   | admin@mytutoringhub.com       | admin123456    |
| Tutor   | tutor@mytutoringhub.com       | tutor123456    |
| Student | student@mytutoringhub.com     | student123456  |

## Payments (Safepay primary)

Hosted checkout: `POST /api/safepay/checkout` → Safepay → return URL `GET /api/safepay/complete`.

Recovery: paste a tracker on the dashboard or call `POST /api/safepay/recover`.

**Schema note:** Subscription rows still use `stripeSubscriptionId` / `stripePriceId`, and users keep `stripeCustomerId`. Live Safepay checkouts store Safepay **tracker** IDs (`track_…`) and encoded amounts (`safepay_CURRENCY_minor`) in those fields. Do not assume a Stripe object id unless the value looks like one. (Renaming these columns is deferred — too risky for this pass.)

Stripe env vars (`STRIPE_*`) and `POST /api/stripe/*` are optional fallbacks when Safepay keys are absent. Prefer Safepay for all new checkouts.

## Payments ops (Safepay)

Production checklist (also on **Admin → Payments**):

1. `SAFEPAY_ENV=production`, `SAFEPAY_API_KEY`, `SAFEPAY_SECRET_KEY`, `NEXT_PUBLIC_APP_URL=https://www.mytutoringhub.com`
2. `CRON_SECRET` — Vercel crons send `Authorization: Bearer <CRON_SECRET>` (digests, hourly reconcile)
3. `SAFEPAY_WEBHOOK_SECRET` (or reuse `CRON_SECRET`) — Safepay POSTs to `/api/safepay/webhook` with `{ "tracker": "track_…" }`
4. Hourly backup: `/api/safepay/reconcile` polls recent `INCOMPLETE` tracker rows

Manual bank transfers: **Admin → Payments → Force complete** (requires an audit `adminNote`).

## SEO ops

After tutor supply grows, ping search engines:

```bash
node scripts/ping-sitemap.mjs
```

Optional env `SITE_SOCIAL_URLS` (comma-separated `https://…`) populates Organization `sameAs` in JSON-LD.

Public footer + share icons use **Production** env vars (redeploy after setting):

- `NEXT_PUBLIC_SOCIAL_LINKEDIN` — e.g. `https://www.linkedin.com/company/mytutoringhub`
- `NEXT_PUBLIC_SOCIAL_FACEBOOK`
- `NEXT_PUBLIC_SOCIAL_INSTAGRAM`
- `NEXT_PUBLIC_SOCIAL_X`
- `NEXT_PUBLIC_SOCIAL_YOUTUBE`
- `NEXT_PUBLIC_SOCIAL_TIKTOK`

## Student requests

Canonical board and API: `/ads` and `/api/ads` (Prisma `StudentAd`).

- `/student-requests` and `/requests` redirect to `/ads`
- Legacy `POST /api/student-requests` returns **410** (writes frozen; Prisma `StudentRequest` model retained)
- Legacy `GET /api/student-requests` proxies open `StudentAd` rows with a `Deprecation` header

## Production notes

- Point `NEXT_PUBLIC_APP_URL` to `https://www.mytutoringhub.com` (or your canonical host)
- Use a strong `AUTH_SECRET` and managed Postgres (`provider = "postgresql"` in Prisma)
- Allowlist the app origin and `/api/safepay/complete` in the Safepay dashboard
- Never commit live Safepay/Stripe secrets
