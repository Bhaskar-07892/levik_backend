# Levik API

The NestJS backend for the **Levik Rewards Programme**. It serves:

- the **admin portal** (`levik-admin`) at `/api/v1/admin/*`;
- the **plumber and retailer mobile app** at `/api/v1/app/*`;
- **public label verification** at `/api/v1/public/*`.

Stack: NestJS 12 (ESM), TypeORM 1 on PostgreSQL 17, class-validator, JWT, Swagger, pino and Vitest.

## Quick start

Requires Node.js 20.9+ and PostgreSQL 15+ (the `pg_trgm` extension is created by the migration).

```bash
npm install
cp .env.example .env
```

Edit `.env` before going further:

- Set `DATABASE_URL`.
- Set `JWT_ACCESS_SECRET` and `QR_SIGNING_SECRET` to two different random strings, each 32+ characters. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Then create the database, seed it and start the server:

```bash
createdb levik_dev
npm run db:seed
npm run start:dev
```

`db:seed` runs the migrations and loads the demo data. Use `npm run db:reset` to wipe and reseed.

- API: http://localhost:4000/api/v1
- Swagger UI: http://localhost:4000/api/docs (disabled when `NODE_ENV=production`)
- Health: `GET /api/v1/health/live` and `GET /api/v1/health/ready` (checks the database)

### Demo accounts (local only)

| Who                     | How to sign in                                                        |
| ----------------------- | --------------------------------------------------------------------- |
| Admin                   | `admin@levik.demo` / `LevikDemo@123`                                  |
| Plumber (Ramesh Kumar)  | OTP to `9829011234`, code `123456` (from `OTP_TEST_CODES`)            |
| Plumber (Rajesh Patel)  | OTP to `9829041127`, code `123456`                                    |
| New user (registration) | OTP to `9900011122`, code `123456`. Signs in as a guest who can register. |

`OTP_TEST_CODES` is ignored when `NODE_ENV=production`.

## Scripts

| Command                    | Purpose                                                          |
| -------------------------- | ---------------------------------------------------------------- |
| `npm run start:dev`        | Watch-mode dev server                                            |
| `npm run build` / `start:prod` | Compile to `dist/`, then run it                              |
| `npm run typecheck`        | `tsc --noEmit`                                                   |
| `npm run lint`             | oxlint                                                           |
| `npm test`                 | Unit tests (serial codes, QR signing, utilities)                 |
| `npm run test:e2e`         | Full HTTP tests against a disposable `levik_test` database (`createdb levik_test` first, or set `TEST_DATABASE_URL`) |
| `npm run migration:run` / `migration:revert` | Apply or roll back migrations                  |
| `npm run db:seed` / `db:reset` | Migrate and seed demo data (`db:reset` truncates first; refused in production) |

## Project structure

```
src/
  main.ts, setup-app.ts       bootstrap; the HTTP pipeline is shared with the e2e tests
  app.module.ts               global guards (throttle → JWT → roles) and exception filter
  config/                     typed config namespaces + Joi env validation (fails fast on boot)
  database/
    migrations/               hand-written SQL migrations (synchronize is off)
    entities.ts               explicit entity registry
    transaction.service.ts    run(work) + advisory locks
    base.repository.ts        repositories accept an optional EntityManager to join a transaction
    seeds/                    demo seed (same data as the admin demo)
  common/                     decorators, guards, filters, errors, pagination, enums, utils
  modules/<feature>/
    controllers/              HTTP only: routes, guards, request DTO → service → response DTO
    dto/                      *.request.dto.ts (validated input), *.response.dto.ts (camelCase output)
    services/                 business rules and transactions; work with BOs
    bo/                       business objects passed between services
    repositories/             all SQL / QueryBuilder code; return DAOs or BOs
    dao/                      TypeORM entities (one per table)
    mappers/                  DAO → BO → DTO conversion
```

Modules: `auth`, `admins`, `participants`, `plumbers`, `retailers`, `products`, `labels`, `scans`, `invoices`, `points`, `rewards`, `redemptions`, `schemes`, `inventory`, `support`, `uploads`, `analytics`, `audit`, `settings`, `health`.

Each layer depends only on the one below it: controller → service → repository. Controllers never touch DAOs, and repositories never hold business rules.

## API overview

All routes are prefixed with `/api/v1`. Swagger lists every request and response schema.

| Area | Admin portal (`role=admin`) | Mobile app (`role=plumber/retailer`) |
| ---- | --------------------------- | ------------------------------------ |
| Auth | `POST /auth/admin/login` | `POST /auth/otp/request`, `POST /auth/otp/verify` |
| | `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | same |
| Dashboard and search | `GET /admin/dashboard?period=`, `/admin/search?q=`, `/admin/notifications` | |
| Plumbers / retailers | list, detail, edit, verification, review, account status | `POST /app/plumbers/register`, `/app/retailers/register`, `GET/PATCH …/me`, `POST /app/plumbers/me/kyc`, `GET /app/stores` |
| Products | CRUD, status | `GET /app/products`, `/app/products/barcode/:code` |
| QR labels | `POST /admin/products/:id/label-batches`, batch list and detail, `labels.pdf`, `labels.csv`, unit lookup and void | `GET /app/labels/resolve?code=` |
| Scans | list, status counts, review, approve, reject, flag | `POST /app/scans`, list, detail |
| Invoices | list, review, start-review, approve, reject, request-info | submit, list, detail, incentive preview, resubmit |
| Points | ledger, totals, balances, manual adjustments | `GET /app/wallet`, `/app/wallet/transactions` |
| Rewards / redemptions | CRUD, stock adjustments; approve, status transitions | catalogue (with `pointsShort`), request, list, cancel |
| Schemes | CRUD, activate, pause, complete, participants and progress | `GET /app/schemes` with my progress |
| Inventory / support | list, summary, update; tickets, notes, status | report stock; raise and track tickets |
| Reports | `/admin/reports/*?period=7d\|30d\|90d\|all&format=csv` | |
| Audit / settings | audit logs + filters; settings | `GET /app/settings` |
| Uploads | `POST /uploads` (multipart), `GET /uploads/:key` (owner or admin) | same |
| Public | `GET /public/labels/verify?code=` | |

### Conventions

- **Pagination:** `?page=1&pageSize=20&search=`. The response is `{ items, page, pageSize, total }`. `pageSize` is at most 100.
- **Errors:** every error has the same shape: `{ statusCode, code, message, details?, path, timestamp }`.
  - `code` is stable and safe to switch on, for example `VALIDATION_FAILED`, `NOT_FOUND`, `CHECKS_FAILED` (the details list the failed checks), `ALREADY_PROCESSED`, `INVALID_STATE`, `DUPLICATE`, `INSUFFICIENT_POINTS`.
  - Postgres constraint errors are mapped to 409 or 422 and never leak SQL.
- **Status codes:**
  - `201` when a resource is created.
  - `200` for actions on an existing resource (approve, reject, status changes).
  - `204` for logout.
- **Validation:** whitelisting is on, so unknown properties are rejected with `400`.

## Product QR labels (unique per unit)

Every physical product unit carries its own label. Scanning a label credits points only once.

1. **Generate:** an admin calls `POST /admin/products/:productId/label-batches` with `{ quantity, note }` (up to 10,000 per batch). This creates a batch `LB-xxxx` and one `product_units` row per label, in a single bulk insert.
2. **Serial:** labels look like `LVK-7K3QX-9MP2D-4`.
   - The serial uses Crockford base32 (no I/L/O/U) and carries 50 random bits.
   - The last character is a check character, so a mistyped code is rejected before any database lookup.
   - Manual entry is forgiving: case, spaces and the look-alike letters O→0 and I/L→1 are all normalised.
3. **Signature:** each QR encodes `${QR_BASE_URL}/<serial>?k=<sig>`, where `sig` is an HMAC-SHA256 of the serial, truncated to 12 base64url characters.
   - A counterfeit label with an invented serial fails verification.
   - Scanning with an ordinary phone camera opens the verification page.
   - **Never rotate `QR_SIGNING_SECRET` after labels are printed.**
4. **Print:** `GET /admin/label-batches/:id/labels.pdf?offset=&limit=` returns A4 sheets (3×8 labels, each showing the QR, serial and model). `labels.csv` gives the same data for an external printer.
5. **Scan (app):**
   - `GET /app/labels/resolve?code=` previews the product and its points.
   - `POST /app/scans { code, retailerId?, invoiceNumber?, photoKey? }` submits the scan. It rejects void, claimed, or already pending serials. Each plumber has a lock and a daily scan limit.
6. **Approve:** when an admin approves a scan, the unit moves from `Available` to `Claimed`. Points are credited once, guarded by a unique index, and scheme bonuses are evaluated in the same transaction.
7. **Verify (public):** `GET /public/labels/verify?code=` returns `{ genuine, status, productName }` and nothing personal.
8. **Void:** `POST /admin/product-units/:serial/void` withdraws damaged or lost labels.

## Data integrity

- **Balances:**
  - Balances are never stored. They come from the append-only `points_ledger`, through the `points_balances` view.
  - Triggers block `UPDATE` and `DELETE` on the ledger, audit logs and status events.
- **Exactly once:**
  - Partial unique indexes allow one credit per scan, invoice and redemption, one refund per redemption, one bonus per scheme and participant, and one approved scan per serial.
  - Retrying an approval returns `409 ALREADY_PROCESSED`.
- **Transactions and locks:**
  - Every approval runs in one transaction. It row-locks the record (`SELECT … FOR UPDATE`) and takes an advisory lock per participant.
  - Concurrent approvals and redemptions therefore cannot overdraw a balance or double-spend stock. The e2e suite fires parallel approvals to prove this.
- **Audit:** every state change writes an audit log and a status event inside the same transaction.

## Queries and performance

- List endpoints run one query each:
  - joins and aggregates are done in SQL (balances view, 30-day sales subquery, scheme progress grouped per participant);
  - there are no N+1 loops;
  - `getManyAndCount` is paginated in the database.
- Search uses `pg_trgm` GIN indexes on names, mobiles and IDs. Each filter column has a composite index matching its sort, for example `(status, submitted_at desc)`.
- Dashboard trends use `generate_series` buckets in `Asia/Kolkata`, so empty days still appear as zero.
- Settings are cached in memory for 30 seconds.

## Security

- **Admin passwords:** hashed with scrypt. Login takes the same time whether or not the email exists.
- **OTP:** codes are stored as HMACs. There is a 30-second resend cooldown, at most 5 requests an hour per number, and at most 5 attempts per code.
- **Tokens:**
  - JWT access tokens: HS256, 15 minutes, with issuer and audience checked.
  - Refresh tokens: opaque, stored as SHA-256 hashes and rotated on every use.
  - Reusing a rotated refresh token revokes every session for that user.
- **Guards:** applied globally, so every route needs a valid token unless marked `@Public`. Role checks are enforced. Guest tokens can only register.
- **Rate limits:** 300 requests a minute per IP; auth endpoints are stricter.
- **HTTP hardening:** helmet, a CORS allow-list (`CORS_ORIGINS`), and request bodies validated and stripped.
- **Uploads:** the file type is checked from its magic bytes, the size is capped, and each file is readable only by its owner and admins.
- **Logs:** tokens, passwords and OTP codes are redacted.

## Configuration

See [.env.example](.env.example). The app refuses to start if a required variable is missing or invalid. These need attention in production:

- `NODE_ENV=production`: disables Swagger, test OTP codes and demo resets.
- `SMS_PROVIDER=msg91` with `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID`. The default `console` provider only logs OTPs.
- `STORAGE_DIR`: local disk storage. Behind the `StorageDriver` interface it can be swapped for S3 or GCS.
- `DB_RUN_MIGRATIONS=false` if migrations are run as a separate deploy step.

## Not yet done

- The admin portal still runs on its localStorage mock. Wiring it to this API is the next step.
- Msg91 SMS delivery is implemented but untested against the live provider.
- Aadhaar/KYC, courier and voucher integrations are recorded manually by admins.
