# Palette — Design Assets Store

A small e-commerce app that exercises the Dodo Payments API end to end in test mode,
built against the `runtime-hardening` fork of `dodopayments-rust`.

## Purpose

This is a demonstration, not a product. Its job is to prove two things:

1. The Dodo Payments API can drive a complete commerce flow from a mobile client.
2. The hardened fork of the Rust SDK is what makes that pleasant — and where it
   still is not, the friction is visible and documented.

Every design decision below resolves in favour of exercising the API. Where a
production system would add durability, reconciliation, or real authentication,
this one does not, deliberately.

## Constraints

- **Test mode only.** Base URL is `https://test.dodopayments.com`. No live key is
  ever read, stored, or committed.
- **Digital goods only.** Dodo is a Merchant of Record: `TaxCategory` offers
  `digital_products`, `saas`, `e_book`, `edtech`, `live_tutoring`, and the string
  "shipping" does not occur anywhere in the SDK. The catalog is design-asset packs
  sold as `digital_products`.
- **No real authentication.** Three seeded demo customers, switched from a picker.
- **Webhooks need a public URL.** Supplied by `cloudflared tunnel` during
  development; the URL changes per session and is registered in the Dodo dashboard.

## Architecture

```
Expo app  ──HTTP──▶  Rust backend  ──SDK──▶  Dodo test API
    │                     │  ▲
    │                  SQLite │
    └──checkout_url──▶ hosted checkout ──webhook──┘
```

The mobile app never holds an API key and never calls Dodo directly. It talks to
the backend, receives a `checkout_url`, and opens it. Dodo calls the backend back
over the tunnel.

### Backend

Rust, `axum`, single binary. The Dodo SDK enters as a git dependency pinned to the
fork's branch — this is what makes the project a demonstration of the fork rather
than of the published crate:

```toml
dodopayments = { git = "https://github.com/sainathr19/dodopayments-rust", branch = "runtime-hardening" }
```

Four modules:

- `main.rs` — config from environment, router assembly, shared state.
- `checkout.rs` — pure functions that build SDK parameters from local input,
  separated from sending so they can be tested without a key or a network.
- `store.rs` — SQLite access.
- `routes/` — one file per resource. Handlers call the SDK directly; the only
  place that works around an SDK rough edge is the seed script, where `Price`
  still has to be written as raw JSON.

Shared state is `Arc<AppState>` holding the Dodo `Client` and a
`Mutex<rusqlite::Connection>`. Handlers take the lock, run one statement, and drop
it before any `await`. At demo traffic this is correct and needs no connection pool.

### Storage

`rusqlite` with the `bundled` feature, so SQLite compiles into the binary: nothing
to install, no `DATABASE_URL` at build time, no migration tooling. One `store.db`
file, two tables created at startup with `CREATE TABLE IF NOT EXISTS`:

```sql
webhook_events(
  webhook_id  TEXT PRIMARY KEY,
  event_type  TEXT NOT NULL,
  payload     TEXT NOT NULL,
  received_at TEXT NOT NULL
);

cart_items(
  customer_id TEXT NOT NULL,
  product_id  TEXT NOT NULL,
  quantity    INTEGER NOT NULL,
  PRIMARY KEY (customer_id, product_id)
);
```

`webhook_id` as primary key makes webhook handling idempotent: Dodo retries on any
non-2xx, and `INSERT OR IGNORE` turns a duplicate delivery into a no-op. This is
the one piece of real payments plumbing the project does not skip.

Everything else is read from Dodo on demand. Orders are `payments.list()`,
membership is `subscriptions.list()`. There is no local mirror and therefore no
reconciliation problem.

### Mobile

Expo with `expo-router`, five tabs:

| Tab | Contents |
|---|---|
| Store | Asset-pack grid, featured Pro banner |
| Cart | Line items, promo-code field, total, checkout |
| Pro | Membership state; subscribe, pause, resume, cancel |
| Orders | Purchase history; invoice download, refund request |
| Profile | Demo-customer switcher, live webhook feed |

Visual reference is Gumroad's product cards and the App Store's featured layout:
dark ground, a single accent, generous spacing, large imagery. A design-assets
catalog gets its appeal from the thumbnails, so the surrounding chrome stays plain.

Checkout opens the returned `checkout_url` in a web sheet. On dismissal the app
refetches rather than trusting the redirect, because the webhook is the
authoritative signal and may arrive first.

## API surface

```
GET  /products                      products.list()
GET  /products/:id                  products.retrieve(id)
GET  /cart?customer_id=             SQLite
POST /cart                          SQLite
DELETE /cart/:product_id            SQLite
POST /cart/preview                  checkout_sessions.preview(...)
GET  /discounts/:code               discounts.retrieve_by_code(code)
POST /checkout                      checkout_sessions.create(...)
GET  /orders?customer_id=           payments.list().customer_id(..)
GET  /orders/:id/invoice            invoices.payments.retrieve(id) -> PDF bytes
POST /orders/:id/refund             refunds.create(..)
GET  /membership?customer_id=       subscriptions.list().customer_id(..)
POST /membership/subscribe          checkout_sessions.create(membership product)
POST /membership/:id/:action        subscriptions.update / change_plan
POST /webhook                       webhooks.verify(body, headers)
GET  /events                        webhook log
```

`checkout_sessions.create` covers both purchase paths: `product_cart` carries the
one-time items, optional `subscription_data` carries the membership, and
`discount_codes` carries the promo. One endpoint, two flows.

`metadata` on the checkout session carries the demo customer id, so a webhook can
be attributed without inference.

`checkout_sessions.preview` takes the same parameters as `create` but charges
nothing, so the cart screen can show the discounted total before the user commits.
`discounts.retrieve_by_code` validates a promo code as it is typed.

Membership actions map to the subscription resource as follows. Pause and resume
are `subscriptions.update` with `pause: Some(true|false)`; cancel is the same call
with `cancel_at_next_billing_date: Some(true)`, which ends the subscription at
period end rather than stranding paid-for time; tier changes are
`subscriptions.change_plan`.

## Data flow: a purchase

1. App posts the cart; backend creates a checkout session and returns `checkout_url`.
2. App opens the URL in a web sheet; the user pays with a test card.
3. Dodo posts `payment.succeeded` to `/webhook` over the tunnel.
4. Backend verifies the signature, inserts the event (ignoring duplicates), clears
   that customer's cart.
5. Sheet dismisses; app refetches orders and the event feed.

The subscription flow is identical, differing only in that step 1 sets
`subscription_data` and step 3 delivers `subscription.active`.

## Error handling

The backend maps SDK errors to HTTP without inventing detail:

- `Error::Api(e)` — pass `e.status` through; body carries `e.message` and
  `e.request_id`. A `request_id` is always surfaced, since it is what makes a
  support conversation with Dodo possible.
- `Error::WebhookVerification(_)` — 400, and nothing is written. An unverified
  body is never parsed.
- `Error::MissingWebhookKey` — 500 at startup, not per request: the key is
  checked when the process boots so a misconfigured deployment fails loudly.
- `Error::Transport(_)` — 502.

The app shows the message and, on failure, keeps the cart intact. No silent
retries: the fork deliberately does not retry POST, and the app must not reinstate
that hazard at a higher layer.

## Testing

Proportionate to a demo, not a product:

- Backend unit tests for the SQLite layer — cart arithmetic and, most importantly,
  that inserting the same `webhook_id` twice yields one row.
- One signature test: a body signed with the real key verifies, a tampered body
  does not. This reuses the approach already proven in the fork's `tests/webhooks.rs`.
- Manual end-to-end: one real test-mode purchase and one membership signup, run
  against the tunnel.

No mocked Dodo API. The point of the project is the real one.

## Out of scope

Merchant operations (payouts, balances, disputes, blocklist), license keys, meters
and usage-based billing, real authentication, and any live-mode path.

## Prerequisites

A Dodo **test-mode API key** and the **webhook signing secret**, supplied as
`DODO_PAYMENTS_API_KEY` and `DODO_PAYMENTS_WEBHOOK_KEY` in a git-ignored `.env`.
Steps up to the seed script do not need them.
