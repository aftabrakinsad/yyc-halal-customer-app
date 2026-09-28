# YYC Halal Meat Shop — Customer App

Mobile-first web app (installable on iPhone/Android as a PWA) for ordering halal meat for in-store pickup.
It also hosts the **shared backend and database** that the YYC Halal Store Management app uses.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL + Prisma 7 · Auth.js (Google Sign-In) · Stripe (cards, debit, Apple Pay, Google Pay) · Nodemailer · Web Push

## Quick start (local)

```bash
npm install
npm run db:local          # terminal 1: local Postgres-compatible DB on :5433 (no Docker needed)
npm run db:migrate && npm run db:seed
npm run dev               # terminal 2: http://localhost:3000
```

The default `.env` runs without any external accounts:
- `AUTH_DEV_LOGIN=true` shows a **Developer sign-in** form (any email, any role). It's disabled in production builds.
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
| POS print agent | `PRINT_AGENT_TOKEN` |
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

## Store Management app integration (same database + these APIs)

All require a signed-in user with a staff role. Every action is written to the append-only `AuditLog` (UPDATE/DELETE are blocked by a DB trigger).

| Endpoint | Role | Purpose |
| --- | --- | --- |
| `GET /api/store/orders?status=IN_PROGRESS,READY_FOR_PICKUP` | employee+ | Order queue |
| `GET /api/store/orders/:id` | employee+ | Full order + audit trail |
| `POST /api/store/orders/:id/status` `{status}` | employee+ | `READY_FOR_PICKUP` / `COMPLETED` / back to `IN_PROGRESS` — notifies the customer instantly |
| `POST /api/store/orders/:id/refunds` | manager+ | `{type:"FULL"}`, `{type:"PARTIAL",amountCents}`, `{type:"ITEM",items:[{orderItemId,quantity}]}` |
| `POST /api/store/orders/:id/cancel` `{reason}` | manager+ | Full refund + restock |
| `GET/PATCH /api/store/settings` | manager+ to edit | Tax rate (`taxRateBps`, 500 = 5%), tax label, pickup text, auto-print, accepting orders… |
| `GET/POST /api/store/flyers`, `PATCH/DELETE /api/store/flyers/:id` | manager+ to edit | Home-page flyers, sales, promotions, announcements (with start/end dates) |
| `GET/POST /api/store/products`, `PATCH /api/store/products/:id` | employee: stock only; manager: prices | Catalog & inventory |
| `GET /api/store/print-jobs`, `GET/POST /api/store/print-jobs/:id` | staff or `Bearer PRINT_AGENT_TOKEN` | Receipt queue; `GET :id` returns 42-column text for ESC/POS thermal printers |

Refunds made directly in the Stripe dashboard are picked up by the webhook and appear on the customer's order too.

Roles: `CUSTOMER`, `STORE_EMPLOYEE`, `STORE_MANAGER`, `ADMIN` (set `User.role` in the database). New units of measure (kg, pack…) are rows in the `Unit` table. Each product also has a `taxable` flag for zero-rated groceries.

## Real-time updates

`/api/events` is a Server-Sent Events stream that watches the shared database every 3 s. When the store changes an order, the customer's open page updates itself and shows a notification. With VAPID keys set, customers who turn on notifications (Profile page) also get phone/desktop push notifications when the app is closed.
