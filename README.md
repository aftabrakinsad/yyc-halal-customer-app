# YYC Halal Meat Shop — Customer App

Mobile-first web app (installable on iPhone/Android as a PWA) for ordering halal meat for in-store pickup.
It also hosts the **shared backend and database** that the YYC Halal Store Management app uses.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL + Prisma 7 · Auth.js (Google Sign-In) · Stripe (cards, debit, Apple Pay, Google Pay) · Nodemailer · Web Push

## Quick start (local)

```bash
npm install
npm run db:local          # terminal 1: local Postgres-compatible DB on :5433 (no Docker needed)
npm run db:migrate && npm run db:seed
npm run dev               # terminal 2: customer app http://localhost:3000 · store app http://localhost:3000/store
```

The default `.env` runs without any external accounts:
- `AUTH_DEV_LOGIN=true` shows a **Developer sign-in** form on `/login` and `/store/login` (any email, any role — pick `STORE_EMPLOYEE`, `STORE_MANAGER` or `ADMIN` for the store app). It's disabled in production builds.
- `PAYMENT_PROVIDER=mock` simulates card payments (success or decline). Also refused in production.
- With no `SMTP_URL`, emails (receipts, ready-for-pickup, refunds) print to the server console.

## Going live — what you need to configure (`.env.example`)

| What | Variables |
| --- | --- |
| PostgreSQL (shared with the Store app) | `DATABASE_URL` |
| Google Sign-In (Google Cloud Console → OAuth client, redirect `https://<domain>/api/auth/callback/google`) | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET` (`npx auth secret`) |
| Stripe | `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Stripe webhook → `https://<domain>/api/webhooks/stripe` | events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `refund.created`, `refund.updated`, `refund.failed` |
| Apple Pay | Register & verify your domain in Stripe Dashboard → Payment method domains |
| Email | `SMTP_URL`, `EMAIL_FROM` |
| Push notifications (optional) | `npx web-push generate-vapid-keys` → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |
| POS print agent | `PRINT_AGENT_TOKEN` (long random string; same value on the store computer) |
| Links in emails | `APP_URL` |

Local webhook testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

**Logo:** `public/brand/logo.svg` is a placeholder. Replace it with the official YYC Halal logo (same filename), then run `npm run brand:icons` to regenerate the app icons and email header image.

## How ordering works

1. The cart lives in the browser and holds **only product ids + quantities**. Every price, tax and total is computed on the server (`src/lib/pricing.ts`).
2. **Review → confirm**: `POST /api/checkout` re-validates stock/quantities, creates a *draft* order (`AWAITING_PAYMENT`, no order number, hidden from My Orders) and a Stripe PaymentIntent. A per-checkout idempotency key means refreshing or double-tapping never creates a second order or charge.
3. Right before charging, `POST /api/checkout/verify` re-checks stock and prices.
4. Card details go directly to Stripe (PCI-compliant Payment Element). Only the transaction id, status, method type, brand and last 4 are stored.
5. Payment is confirmed by the **Stripe webhook** (the confirmation page also asks Stripe directly as a fallback). Only then is the order confirmed: stock deducted, order number `YYC-2026-000123` issued from an atomic per-year counter, status → **In Progress**, receipt emailed, print job queued.
6. If an item sells out during payment, the order is automatically cancelled and fully refunded.

## Store app (`/store`)

Sign in at **`/store/login`** with an approved Google account. Customer accounts are sent to a "not authorized" page.
Only the menus a role may use are shown, and every API re-checks the role on the server (`src/lib/permissions.ts`).

| Section | Employee | Manager | Admin |
| --- | :-: | :-: | :-: |
| Dashboard — live order cards, Ready for Pickup / Picked Up, print receipt | ✓ | ✓ | ✓ |
| Orders — search by order number, name or email; order detail & history | ✓ | ✓ | ✓ |
| Refunds (full, cancel & refund, per-item) | | ✓ | ✓ |
| Products, Inventory, Flyers, Reports & PDF | | ✓ | ✓ |
| Employees, Settings, Audit Log | | | ✓ |

**First admin:** sign in once with Google, then set your role in the database:
`UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@gmail.com';` After that, admins approve everyone else on the Employees page.
Disabling an employee or changing their role takes effect on their very next request.

**Live orders:** the dashboard listens to `/api/store/events`. A newly *paid* order (never a failed or abandoned checkout) appears
within ~3 seconds with a NEW badge, a pop-up, an optional chime (Sound toggle) and a tab-title counter. Completed orders leave the
dashboard but stay searchable.

**Refund safety:** the server calculates every refund amount. The confirmation screen shows the order number, the original payment
and the refund amount, and the employee must tick a confirmation. The request then has to repeat the order number and amount
that were confirmed. The server refuses it if either no longer matches (e.g. a stale screen or tampering). Refunds can never exceed the
amount paid, require a reason, and are audit-logged with the employee, items, amount, reason and processor refund ID.

**Reports:** daily, weekly (Mon–Sun), monthly, quarterly, yearly or custom, in Calgary time. Gross sales are before tax; net sales
subtract the before-tax part of refunds issued in the period, so refunded money is never counted as sales. **Download PDF** produces a
letter-size business record.

### POS receipt printer

Each paid order (if *Print receipts automatically* is on), refund and manual **Print Receipt** press is queued. Run the agent on a
computer in the store:

```bash
APP_URL=https://<your-domain> PRINT_AGENT_TOKEN=<same as server> PRINTER_HOST=<printer IP> node scripts/print-agent.mjs
```

It sends 42-column ESC/POS text to any network thermal printer on port 9100 (use `PRINTER_HOST=stdout` to test in a terminal).
Staff can also use **Print from this computer** for an 80 mm receipt with the logo. Full card numbers are never printed or stored.

### Store APIs

All under `/api/store/*`, all role-checked: `orders` (search), `orders/:id`, `orders/:id/status`, `orders/:id/print`,
`orders/:id/refunds/preview`, `orders/:id/refunds`, `orders/:id/cancel`, `products`, `products/:id`, `categories`, `uploads`,
`flyers`, `flyers/:id`, `reports`, `reports/pdf`, `employees`, `employees/:id`, `settings`, `print-jobs`, `events`.

## Real-time updates

`/api/events` is a Server-Sent Events stream that watches the shared database every 3 s. When the store changes an order, the customer's open page updates itself and shows a notification. With VAPID keys set, customers who turn on notifications (Profile page) also get phone/desktop push notifications when the app is closed.
