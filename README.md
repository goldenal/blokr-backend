# blokr-backend

NestJS + Prisma REST API for **blokr** — a Nigeria-focused direct-to-professional booking
and Paystack payments platform. Serves the frontend prototype at
[`../blokr`](../blokr), whose `lib/store.ts` / `lib/types.ts` define the API contract
this backend implements for real.

## Stack

NestJS 11, Prisma 6 (PostgreSQL), self-managed JWT auth (access + refresh, rotate-on-use),
Paystack (checkout + subaccount settlement + webhooks), Google Calendar OAuth scaffolding,
Swagger docs at `/docs`.

## Local development

```bash
npm install
cp .env.example .env       # fill in real values later; placeholders boot fine
docker compose up -d       # local Postgres on :5432
npx prisma migrate deploy  # applies migrations, including the hand-added
                            # partial unique index for booking concurrency
npx prisma db seed         # 3 demo professionals, services, availability, sample bookings
npm run start:dev          # listens on PORT from .env (default 3003)
```

Demo login: `john@blokr.dev` / `amaka@blokr.dev` / `tunde@blokr.dev`, password from
`SEED_DEMO_PASSWORD` in `.env` (default `Passw0rd!`).

Swagger UI: `http://localhost:<PORT>/docs`.

**Port note**: defaults to `3003` to avoid colliding with the sibling `cribcheck-backend`
(3001) and the blokr frontend's own Next.js dev server (3002) when running all three
locally at once.

### Verifying the booking flow end-to-end

```bash
BASE_URL=http://localhost:3003 ./scripts/smoke-test.sh
```

Registers a professional, creates a profile/service/availability, computes slots, fires
two concurrent hold requests for the same slot (asserting exactly one succeeds), and
exercises checkout init. Paystack webhook confirmation requires a non-placeholder
`PAYSTACK_SECRET_KEY`/`PAYSTACK_WEBHOOK_SECRET` in `.env` — with real keys, sign a test
payload like:

```bash
BODY='{"event":"charge.success","data":{"reference":"<paystack-transaction-reference>","channel":"card"}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha512 -hmac "$PAYSTACK_WEBHOOK_SECRET" | sed 's/^.* //')
curl -X POST http://localhost:3003/payments/paystack/webhook \
  -H "Content-Type: application/json" -H "x-paystack-signature: $SIG" -d "$BODY"
```

## Key architectural notes

- **Money** is stored as integer kobo in the database; API request/response DTOs speak
  naira (matching the frontend's `priceNaira`/`amountNaira`), converted at the boundary
  via `src/common/constants/money.ts`.
- **Booking concurrency**: a partial unique index on
  `bookings (professional_id, date, start_time) WHERE status IN ('HELD','PENDING_PAYMENT','CONFIRMED')`
  (hand-added to `prisma/migrations/*_init/migration.sql`, since Prisma's `@@unique` can't
  express a `WHERE` clause) is the correctness guarantee against double-booking. See
  `BookingsService.attemptHold` in `src/bookings/bookings.service.ts`.
- **Expired holds** are treated as free everywhere it matters (slot computation, hold
  creation, checkout) via lazy `heldUntil` checks — not dependent on a cron running. The
  `@Cron` sweep in `bookings-cleanup.service.ts` is dashboard hygiene only.
- **Slot computation** (`src/availability/availability.service.ts`) is a direct
  server-side port of the frontend's `lib/availabilityEngine.ts`, with the pure minute-math
  helpers lifted verbatim into `src/availability/slot-math.ts`.
- **Auth** is self-managed JWT (not a third-party provider): 15-minute access tokens,
  30-day refresh tokens stored server-side only as a SHA-256 hash, rotated on every use.
  Every route requires auth by default (`JwtAuthGuard` + `RolesGuard` are global); opt out
  with `@Public()`, gate with `@Roles(...)`.
- **Guest checkout**: customers don't get accounts in v1 — booking contact details are
  free-text fields on `Booking`, matching the current frontend. Only professionals register.

## Deployment

`render.yaml` defines a Render Blueprint (`prisma migrate deploy` runs in the build step,
health check at `/health`). Database and Paystack/Google secrets are marked `sync: false`
and must be set in the Render dashboard.
