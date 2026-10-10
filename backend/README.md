# Fresh & Pure (Dinesh Farms) — Customer API

Node.js + Express + PostgreSQL backend. Boot-tested — `node server.js` starts cleanly and `/health` responds correctly.

## Setup

1. `cp .env.example .env` and fill in real values (DB, Upstash Redis, MSG91, Razorpay, Resend, Firebase, Kafka).
2. `docker-compose up -d` — starts local Postgres + Kafka/Zookeeper. (Redis is **not** included — this project uses Upstash, a hosted service reached over HTTPS, not a local instance.)
3. `npm install`
4. `npm run migrate` — applies `db/schema.sql`.
5. `npm run dev`

## Endpoint map

**Auth** — `POST /api/auth/otp/send`, `POST /api/auth/otp/verify` (also registers a new user if the phone isn't found), `POST /api/auth/refresh`, `POST /api/auth/logout`

**Profile** — `POST /api/profile/complete`, `GET /api/profile/me`, `PATCH /api/profile/me`

**Addresses** — `GET /api/addresses/check-serviceability`, `POST /api/addresses`, `GET /api/addresses`, `PATCH /api/addresses/:id`, `DELETE /api/addresses/:id`, `PATCH /api/addresses/:id/set-default`

**Home** — `GET /api/home/banners` (public, reads `home_banners`, Redis-cached for 1 hour), `GET /api/home/popular-products` (authenticated, Redis-cached for 5 min)

**Wallet** — `GET /api/wallet`, `POST /api/wallet/topup`, `POST /api/wallet/topup/verify`, `GET /api/wallet/transactions?offset=0` (10 rows per page; increment offset by 10)

**Products** — `GET /api/products`, `GET /api/products?category=`, `GET /api/products/search?q=`, `GET /api/products/:id`

**Orders** — `POST /api/orders`, `GET /api/orders?date=`, `GET /api/orders/:id`, `GET /api/orders/:id/invoice`, `PATCH /api/orders/:id/cancel`

**Subscriptions** — `POST /api/subscriptions` (body shape depends on `frequency`: DAILY / ALTERNATE / CUSTOM), `GET /api/subscriptions`, `GET /api/subscriptions/:id`, `PATCH /api/subscriptions/:id/pause`, `PATCH /api/subscriptions/:id/skip`, `DELETE /api/subscriptions/:id`

**Notifications** — `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/mark-all-read`, `POST /api/notifications/device-token`

**Payment methods** — `POST /api/payment-methods`, `GET /api/payment-methods`, `DELETE /api/payment-methods/:id`

## Key design decisions worth knowing

- **Wallet is a ledger** (`wallet_transactions`), never a bare counter. Balance is always `SUM(amount)`. Debit/credit use a Postgres advisory transaction lock (`pg_advisory_xact_lock`) so concurrent requests for the same user can't both read a stale balance — this only works because the lock and the read-then-write happen inside one real `BEGIN`/`COMMIT` (see `utils/walletService.js`).
- **Order placement is one atomic transaction** — wallet debit and order row insert happen together in `orderController.createOrder`; if either fails, both roll back.
- **Order IDs** (`DF-CM20260912-098`) use an atomic Postgres upsert counter (`order_counters`), keyed per-product-per-day, so concurrent order creation never collides.
- **OTP rate limiting** is two-layered: per-IP (`express-rate-limit`, in `rateLimiter.middleware.js`) and per-phone-number (Upstash Redis, in `otpService.checkOtpSendRateLimit`) — an attacker rotating IPs still can't spam one phone number.
- **Kafka** is scoped to transactional emails only (order confirmation, subscription created, wallet top-up, invoice) — it deliberately does NOT carry push notifications, since those write directly to Postgres and call FCM synchronously in `pushNotificationService.js` so the in-app notification row and the push are never out of sync.
- **Postgres has no TTL index** like Mongo — expired OTP rows are swept by a `setInterval` in `server.js` every 10 minutes rather than relying on the database to self-clean.

## Dropped from your original package list

- `bcryptjs` — no password anywhere in an OTP-only auth flow. Add it back if you introduce an admin panel login.
- `multer` — no file-upload endpoint was defined (e.g. profile photo). Add it back along with an endpoint if that's needed.
- `mongoose` / `@upstash/redis`+`redis` conflict — resolved per your instruction: SQL (`pg`) for the database, Upstash only for Redis.

## Still needs a decision from you

- Serviceable pincodes remain env-driven until they need to be editable without a deploy.
- Firebase push notifications are wired but silently no-op until `FIREBASE_SERVICE_ACCOUNT_BASE64` is set — confirm FCM is actually your intended push provider.
