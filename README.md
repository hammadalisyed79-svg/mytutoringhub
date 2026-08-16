# MyTutoringHub

FindTutor-style marketplace for **mytutoringhub.com**: students and tutors pay platform subscriptions; lesson fees stay between them.

## Features

- Student Pass & Tutor Basic subscriptions (Stripe Checkout + Customer Portal)
- Verified Tutor & Highlighted Listing add-ons
- Tutor search with filters, student request ads, in-app messaging
- Reviews (after messaging), admin moderation, Resend email hooks

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, Prisma + SQLite (swap to PostgreSQL for production), Auth.js, Stripe, Resend.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill Stripe / Resend keys (optional for local — without Stripe keys, checkout activates subscriptions in **dev mode**).
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

## Stripe

Create four recurring Prices and set:

- `STRIPE_PRICE_STUDENT_PASS`
- `STRIPE_PRICE_TUTOR_BASIC`
- `STRIPE_PRICE_VERIFIED_TUTOR`
- `STRIPE_PRICE_HIGHLIGHTED_AD`

Webhook endpoint: `POST /api/stripe/webhook` (events: `checkout.session.completed`, `customer.subscription.*`).

## Production notes

- Point `NEXT_PUBLIC_APP_URL` to `https://mytutoringhub.com`
- Change `AUTH_SECRET` and use PostgreSQL (`provider = "postgresql"` in Prisma schema)
- Configure DNS for mytutoringhub.com to your host (Vercel, etc.)
