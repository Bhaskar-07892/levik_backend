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

- API: http://localhost:4100/api/v1
- Swagger UI: http://localhost:4100/api/docs (disabled when `NODE_ENV=production`)
- OpenAPI JSON: http://localhost:4100/api/docs/openapi.json. The admin portal generates its typed client from this with `npm run api:types`.
- Health: `GET /api/v1/health/live` and `GET /api/v1/health/ready` (checks the database)

### Demo accounts (local only)

| Who                     | How to sign in                                                        |
| ----------------------- | --------------------------------------------------------------------- |
| Admin                   | `admin@levik.demo` / `LevikDemo@123`                                  |
| Plumber (Ramesh Kumar)  | OTP to `9829011234`, code `123456` (from `OTP_TEST_CODES`)            |
| Plumber (Rajesh Patel)  | OTP to `9829041127`, code `123456`                                    |
| New user (registration) | OTP to `9900011122`, code `123456`. Signs in as a guest who can register. |

`OTP_TEST_CODES` is ignored when `NODE_ENV=production`.

## Deployment

The hosted staging environment (Render API, Vercel admin portal, EAS APK with over-the-air updates) and its CI/CD are described in [DEPLOYMENT.md](DEPLOYMENT.md).

## Environments (Neon)

The team uses three Neon projects in `ap-southeast-1` (Singapore): `levik-dev`, `levik-staging` and `levik-prod`.

| | dev | staging | prod |
|---|---|---|---|
| Database | your own branch of `levik-dev` (`main` holds the shared seed) | `levik-staging` | `levik-prod` |
| Seed / reset | `db:seed`; `db:reset` with `ALLOW_DB_RESET=true` | `db:seed` for demos | never |
| Migrations | `npm run migration:run` | run automatically when the Render service starts | `npm run migration:run` after branching a backup |
| Secrets | your own `.env` (git-ignored) | hosting platform | hosting platform |

**Joining as a developer:**
1. Ask an admin to invite you to the Neon organisation as a Collaborator on `levik-dev`.
2. In `levik-dev`, create a branch named `dev-<your name>` from `main`.
3. Copy its pooled and direct connection strings into `.env` as `DATABASE_URL` and `DATABASE_MIGRATION_URL`, and set `DB_SSL=true` and `DB_RUN_MIGRATIONS=false`.
4. Run `npm run migration:run`, then `npm run start:dev`.

**Rules:**
- **Migrations and seeding** use `DATABASE_MIGRATION_URL`, the direct connection, when it is set. The app always uses the pooled `DATABASE_URL`.
- **`db:reset`** refuses to wipe a remote database unless `ALLOW_DB_RESET=true`, and always refuses when `NODE_ENV=production`. Never set `ALLOW_DB_RESET` on staging or prod.
- **Before a prod migration**, create a branch of `levik-prod` (for example `backup-2026-10-19`) as an instant restore point.

## Scripts

| Command                    | Purpose                                                          |
| -------------------------- | ---------------------------------------------------------------- |
| `npm run start:dev`        | Watch-mode dev server                                            |
| `npm run build` / `start:prod` | Compile to `dist/`, then run it                              |
| `npm run typecheck`        | `tsc --noEmit`                                                   |
| `npm run lint`             | oxlint                                                           |
| `npm test`                 | Unit tests (serial codes, QR signing, utilities)                 |
| `npm run test:e2e`         | Full HTTP tests against a disposable `levik_test` database (`createdb levik_test` first, or set `TEST_DATABASE_URL`) |
| `npm run migration:run` / `migration:revert` / `migration:show` | Apply, roll back or list migrations (uses `DATABASE_MIGRATION_URL` if set) |
| `npm run db:seed` / `db:reset` | Migrate and seed demo data (`db:reset` truncates first; local databases only unless `ALLOW_DB_RESET=true`; never in production) |

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
| Explore | | `GET /app/explore/products`, `/app/explore/products/:id` (dealers stocking it, nearby first), `/app/explore/dealers`, `/app/explore/dealers/:id` (products in stock with role-specific points and live schemes) |
| QR labels | `POST /admin/products/:id/label-batches`, batch list and detail, `labels.pdf`, `labels.csv`, unit lookup and void | `GET /app/labels/resolve?code=` |
| Scans | list, status counts, review, approve, reject, flag | `POST /app/scans`, list, detail |
| Invoices | list, review, start-review, approve, reject, request-info | submit, list, detail, incentive preview, resubmit |
| Points | ledger, totals, balances, manual adjustments | `GET /app/wallet`, `/app/wallet/transactions` |
| Rewards / redemptions | CRUD, stock adjustments; approve, status transitions | catalogue (with `pointsShort`), request, list, cancel |
| Schemes | CRUD, activate, pause, complete, participants; `GET /admin/schemes/progress?userId=` (one participant across live schemes) | `GET /app/schemes` with my progress |
| Inventory / support | list, summary, update; tickets, notes, status | report stock; raise and track tickets |
| Reports | `/admin/reports/*?period=7d\|30d\|90d\|all&format=csv` | |
| Audit / settings | audit logs + filters, `export.csv`; settings | `GET /app/settings` |
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

- `NODE_ENV=production`: optimised logging and refuses demo resets. `APP_ENV` (defaults to `production` when `NODE_ENV=production`) controls Swagger and test OTP codes: both stay on with `APP_ENV=staging`.
- `SMS_PROVIDER=msg91` with `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID`. The default `console` provider only logs OTPs.
- `TEST_OTP`: one 6-digit code that signs in **every** number without sending an SMS, for test environments (staging sets `123456`). `OTP_TEST_CODES` sets codes for specific numbers and wins over it. Both are ignored when `APP_ENV=production`.
- `STORAGE_DRIVER`: `local` (files under `STORAGE_DIR`, for development) or `s3` for any S3-compatible bucket (Cloudflare R2, Backblaze B2, AWS S3) configured with `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`. See [DEPLOYMENT.md](DEPLOYMENT.md#5-file-storage-cloudflare-r2).
- `DB_RUN_MIGRATIONS=false` if migrations are run as a separate deploy step.

## Admin portal

The admin portal (`levik-admin`) is wired to this API. It needs:

- its origin listed in `CORS_ORIGINS` (default `http://localhost:3020`);
- `NEXT_PUBLIC_API_URL` set to this API's origin.

After changing a DTO, regenerate the portal's types: run `npm run api:types` in `levik-admin` while the API is running.

When a DTO field uses a validator the Swagger plugin cannot read (for example `@NotEquals`), add an explicit `@ApiProperty`. Otherwise the field is missing from the spec and from the generated client.

## Not yet done

- Msg91 SMS delivery is implemented but untested against the live provider.
- Aadhaar/KYC, courier and voucher integrations are recorded manually by admins.
