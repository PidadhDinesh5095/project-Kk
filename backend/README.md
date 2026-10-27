# Fresh & Pure (Dinesh Farms) — Customer API

Node.js + Express + PostgreSQL backend. Boot-tested — `node server.js` starts cleanly and `/health` responds correctly.

## Setup

1. Create `backend/.env` and configure the required DB, Upstash Redis, MSG91, and Razorpay values. Add Kafka and Firebase values as described below; never commit `.env`.
2. `docker-compose up -d` — starts local Postgres + Kafka/Zookeeper. (Redis is **not** included — this project uses Upstash, a hosted service reached over HTTPS, not a local instance.)
3. `npm install`
4. `npm run migrate` — applies `db/schema.sql`.
5. `npm run dev`

For an existing database, run `npm run migrate:notification-types` once before restarting the Kafka consumer. This updates the notification type constraint so every notification type currently emitted by the backend, including `DELIVERY_DATES_PAUSED`, can be stored.

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
- **Kafka** carries order, wallet, subscription, address-serviceability, and notification-delivery events. The consumer writes in-app notification records to Postgres and sends push notifications through Firebase Cloud Messaging. Email delivery is disabled unless `NOTIFICATIONS_EMAIL_ENABLED=true`.
- **Aiven Kafka**: set `KAFKA_BROKERS` to the service's bootstrap host and port (comma-separated if multiple), `KAFKA_USERNAME` and `KAFKA_PASSWORD` to the service credentials, and `KAFKA_SASL_MECHANISM` to the mechanism shown in Aiven (commonly `scram-sha-256`). The CA is loaded in this order: `KAFKA_CA_BASE64`, `KAFKA_CA_PATH`, then `backend/kafka/certs/ca.pem`. For deploys, `KAFKA_CA_BASE64` can contain the Base64-encoded CA certificate; locally, save the downloaded Aiven CA at the fallback path. TLS certificate verification remains enabled. Also set unique `KAFKA_CLIENT_ID` and `KAFKA_GROUP_ID` values if needed. The app creates its two notification topics at startup, so the Aiven user needs topic create/list/read/write permissions.
- **Firebase push (optional)**: if Firebase credentials are not configured, Kafka-backed in-app notifications continue to work, but mobile push is disabled. To enable push later, put the Firebase Admin service-account JSON in a local file and set `FIREBASE_SERVICE_ACCOUNT_BASE64` to its Base64-encoded contents. For example, in PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\path\service-account.json'))`. Do not commit the service-account file or paste it into chat. Mobile device tokens are stored by `POST /api/notifications/device-token`; native Firebase configuration and APNs setup are also required for the corresponding mobile platforms.
- **In-app notifications** are fetched from `GET /api/notifications`; reading one persists through `PATCH /api/notifications/:id/read`, and clearing the list uses `DELETE /api/notifications`. Existing databases must run `npm run migrate:notification-types` before starting the updated consumer. New databases can use `db/schema.sql`.
- **Current event triggers**: order confirmation and invoice events after a one-time order is committed; cancellation and wallet refund events after an order is cancelled; top-up success after Razorpay verification; withdrawal after a wallet debit; subscription create/pause/resume/restart/schedule/skip/cancel; date-pause notifications and refunds for cancelled one-time orders; and an unserviceable-area demand/notification when a non-serviceable address is saved. Delivery-status handlers exist, but no delivery/operator API currently changes orders to out-for-delivery or delivered, so those events require that workflow to be added before they can be emitted.
- **Postgres has no TTL index** like Mongo — expired OTP rows are swept by a `setInterval` in `server.js` every 10 minutes rather than relying on the database to self-clean.

## Dropped from your original package list

- `bcryptjs` — no password anywhere in an OTP-only auth flow. Add it back if you introduce an admin panel login.
- `multer` — no file-upload endpoint was defined (e.g. profile photo). Add it back along with an endpoint if that's needed.
- `mongoose` / `@upstash/redis`+`redis` conflict — resolved per your instruction: SQL (`pg`) for the database, Upstash only for Redis.

## Still needs a decision from you

- Serviceable pincodes remain env-driven until they need to be editable without a deploy.
- Push registration is implemented: after OTP sign-in the app requests notification permission, obtains a native FCM token, and registers it at `POST /api/notifications/device-token`; the authenticated endpoint stores it in `users.device_tokens`. On later launches, registration is refreshed only when permission is already granted. To enable delivery, provide the backend `FIREBASE_SERVICE_ACCOUNT_BASE64` service account and the frontend `google-services.json` / `GoogleService-Info.plist` files, then rebuild the native app. iOS delivery also requires APNs configured for that Firebase app. Kafka sends the push-delivery event to the backend consumer.
