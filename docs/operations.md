# Operations

## Deploy Checklist

1. Set the required environment variables in your hosting platform.
2. Run Prisma migrations with `npx prisma migrate deploy`.
3. Regenerate the Prisma client with `npx prisma generate --no-engine` if the native engine file is locked on Windows.
4. Verify `npm test`, `npm run lint`, and `npm run build`.
5. Confirm Stripe webhook delivery for both platform and connected-account events.
6. Confirm the reminder scheduler is sending the `CRON_SECRET`.

## Stripe

### Webhook Endpoint

- `POST /api/stripe/webhook`

### Secrets

- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_WEBHOOK_SECRET`

Both secrets can be configured at the same time. The webhook handler will try the connect secret and the platform secret before rejecting the signature.

### Current Payment Safety

- unpaid invoices reuse an active Stripe Checkout session when possible
- checkout creation uses a short invoice-level lock to reduce duplicate session creation
- repeated webhook or return-page confirmation for the same session is idempotent
- if Stripe reports another paid session for an already-paid invoice, the app logs a `payment_review` activity event for manual follow-up

## Reminder Scheduler

### Endpoint

- `POST /api/cron/reminders`

### Auth

Provide one of:

- `Authorization: Bearer <CRON_SECRET>`
- `x-cron-secret: <CRON_SECRET>`

`GET` is intentionally not allowed.

## Supabase Admin Usage

`SUPABASE_SERVICE_ROLE_KEY` is required for:

- logo uploads
- expense receipt uploads

Without it, the app can still build, but those server-side admin operations will fail.

## Legal and Retention Notes

- Privacy and terms pages are published at `/privacy` and `/terms`.
- Fill the legal profile environment variables before production so those pages show your real entity and contact details.
- Self-serve destructive account deletion is disabled because invoice and accounting records may need to be retained.
- Review [docs/compliance-checklist.md](docs/compliance-checklist.md) before launch.

## PWA Cache Behavior

- public routes such as `/`, auth pages, and public invoice pages can use offline/public caching
- authenticated app navigations are not cached by the service worker
- signing out or deleting an account clears the app cache to avoid stale authenticated shells on shared devices
