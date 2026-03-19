# Sierra Invoices

Sierra Invoices is a Next.js invoicing app for small businesses and freelancers. It covers clients, invoices, expenses, reminder emails, Stripe payments, public invoice links, and installable PWA behavior.

## Stack

- Next.js App Router
- React 19
- Prisma + PostgreSQL
- Supabase Auth and Storage
- Stripe + Stripe Connect
- Resend for transactional email

## Core Features

- client and business management
- invoice creation, duplication, sending, and reminders
- public invoice pages with PDF download and online payment
- expenses with receipt uploads
- analytics dashboard
- platform Stripe account support plus connected-account Stripe businesses
- installable PWA with offline fallback for public routes

## Local Setup

1. Install dependencies.
2. Configure environment variables.
3. Run Prisma migrations.
4. Start the dev server.

```bash
npm install
npx prisma migrate deploy
npx prisma generate --no-engine
npm run dev
```

The app runs at `http://localhost:3000`.

## Environment Variables

### Required

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `RESEND_API_KEY`

### Strongly Recommended For Production

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_WEBHOOK_SECRET`
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL`

### Optional

- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO_EMAIL`
- `SUPABASE_LOGOS_BUCKET` or `NEXT_PUBLIC_SUPABASE_LOGOS_BUCKET`
- `SUPABASE_EXPENSES_BUCKET` or `NEXT_PUBLIC_SUPABASE_EXPENSES_BUCKET`
- `LEGAL_ENTITY_NAME`
- `LEGAL_SERVICE_NAME`
- `LEGAL_CONTACT_EMAIL`
- `LEGAL_SUPPORT_EMAIL`
- `LEGAL_POSTAL_ADDRESS`
- `LEGAL_GOVERNING_LAW`
- `LEGAL_JURISDICTION`

## Useful Commands

```bash
npm run dev
npm test
npm run lint
npm run build
npx prisma migrate deploy
npx prisma generate --no-engine
```

## Production Notes

- Stripe platform and connect webhooks are both handled at `/api/stripe/webhook`.
- Scheduled reminders now require `POST /api/cron/reminders` plus `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`.
- Privacy and terms pages are available at `/privacy` and `/terms`.
- Self-serve account deletion is intentionally disabled until a retention-safe archival flow exists for invoice and accounting records.
- The PWA service worker only caches public navigations and static shell assets. Authenticated app pages are intentionally not cached.

## Docs

- [docs/operations.md](docs/operations.md)
- [docs/pwa-usage.md](docs/pwa-usage.md)
- [docs/native-readiness.md](docs/native-readiness.md)
