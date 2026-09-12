# Palette

A small design-assets storefront — Expo app, Rust backend — built to exercise the
[Dodo Payments](https://dodopayments.com) API end to end in **test mode**.

> [!NOTE]
> This is a demonstration, not a product. It runs against
> `https://test.dodopayments.com` only. It is not affiliated with Dodo Payments.

It depends on a [hardened fork](https://github.com/sainathr19/dodopayments-rust/tree/runtime-hardening)
of the Rust SDK rather than the published crate, and exists partly to show what
that fork fixes under real use.

## What it does

Browse design-asset packs, add them to a cart, and apply a promo code — the cart is
priced by Dodo, so the discount and total appear before you commit to anything.
Pay through Dodo's hosted checkout. Subscribe to a Pro membership and pause, resume
or cancel it; a subscription whose first payment failed is reported as such rather
than shown as a live plan. See past orders, download an invoice, request a refund.
Watch webhooks land live while it happens.

## Layout

```
backend/   Rust — axum, rusqlite (bundled), the SDK fork as a git dependency
mobile/    Expo — expo-router, five tabs
docs/      Design spec
```

## Running it

Requires a Dodo **test-mode** API key and webhook signing secret.

```bash
cd backend
cp .env.example .env      # then fill in both values
cargo run
```

Webhooks need a public URL. In a second terminal:

```bash
cloudflared tunnel --url http://localhost:8080
```

Register the printed HTTPS URL, suffixed with `/webhook`, in the Dodo dashboard.
The URL changes each time the tunnel restarts.

## Verified end to end

Run against Dodo test mode on 9-11 September 2026, through a Cloudflare tunnel,
with real webhook signatures. Totals below are the account's actual state.

| Flow | Result |
|---|---|
| Seed catalog, customers, promo code | 5 products, 3 customers, `PALETTE20`; re-running creates nothing |
| Promo priced in-app before checkout | $61.00 &minus; $12.20 = $48.80, exactly 20%, computed by Dodo |
| Invalid promo code | Dodo's own 404 message surfaced: `Discount code 'NOPE99' doesn't exist` |
| Checkout and card payment | 8 payments, 7 `succeeded` |
| Webhook delivery and signature check | 17 events, every one verified before parsing |
| Unsigned and forged webhooks | rejected `400`, nothing stored |
| Event typing | `payment.succeeded`, `payment.failed`, `subscription.paused` / `unpaused` / `active` / `failed` all dispatched on the discriminator |
| Cart cleared by `payment.succeeded` | yes, and only the paying customer's |
| Order history, typed status filters | `succeeded` 3, `failed` 0 for one customer |
| Invoice download | real 51K PDF |
| Membership subscribe | active, $9.00/month |
| Pause, resume | `active -> paused -> active` |
| Failed subscription | reported as failed, with a retry rather than pause/cancel controls |
| In-app checkout and deep-link return | sheet dismisses, cart refreshes |

Not verified: refunds. The API returns `409 Insufficient funds in wallet` because
a test-mode payment has not settled, so there is no balance to refund from. The
route, its error mapping and the app's confirmation dialog are in place and the
call reaches the API; only the API-side outcome is untested.

Two of the 17 stored events are labelled `other`: they arrived before the event
name table covered `subscription.updated` and `subscription.renewed`. The SDK
decoded them correctly at the time; only the display label was missing, and
stored rows are left as they were rather than rewritten.

## What this surfaced in the SDK

Running a real storefront against the live API found problems no amount of
source review would have: the code had to actually send and receive things.
All of these are now fixed in the fork this depends on.

| Found | Fixed in |
|---|---|
| `SubscriptionsUpdateParams.pause` was stale &mdash; sending it returns `422 pause was removed; use status: paused or status: active instead` | [`4fbd82d`](https://github.com/sainathr19/dodopayments-rust/commit/4fbd82d) |
| 23 of 48 webhook events handed back `serde_json::Value` instead of a typed payload | [`a2d7c2c`](https://github.com/sainathr19/dodopayments-rust/commit/a2d7c2c) |
| `Price` was an untagged union of three `Value`s, so a recurring price read as a one-time one &mdash; the spec declares `discriminator: type` and the generator ignored it | [`ecc5653`](https://github.com/sainathr19/dodopayments-rust/commit/ecc5653) |
| Fieldless enums like `Currency` were boxed 49 times &mdash; a heap allocation to hold one byte | [`681d502`](https://github.com/sainathr19/dodopayments-rust/commit/681d502) |

Two of those bit this codebase directly. The seed script used to build prices as
hand-written JSON because `Price` could not be constructed any other way; it now
goes through `OneTimePrice::new` and `RecurringPrice::new`. The mobile app
rendered `NaN` on the product detail screen, because `GET /products` returns
`price` as a flat integer while `GET /products/{id}` returns an object wrapping
it &mdash; one field name, two types.

Also worth reporting upstream: Dodo's own spec marks `integration_type` and
`metadata` as required on `EntitlementGrantResponse`, but every one of their
documented `entitlement_grant.*` webhook examples omits both, so a client that
follows the schema rejects the payload the docs publish.

## Design

See [docs/2026-09-10-palette-design.md](docs/2026-09-10-palette-design.md) for the
full design, including why the catalog is digital (Dodo is a Merchant of Record and
supports no physical tax category) and why there is no reconciliation layer.
