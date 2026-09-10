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

Browse design-asset packs, add them to a cart, apply a promo code, and pay through
Dodo's hosted checkout. Subscribe to a Pro membership and pause, resume, or cancel
it. See past orders, download an invoice, request a refund. Watch webhooks land
live while it happens.

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

Run against Dodo test mode on 2026-09-10, through a Cloudflare tunnel, with real
webhook signatures:

| Flow | Result |
|---|---|
| Seed catalog, customers, promo code | 5 products, 3 customers, `PALETTE20` |
| Promo preview | $87.00 - $17.40 = $69.60, exactly 20% |
| Checkout and card payment | 3 payments, all `succeeded` |
| Webhook delivery and signature check | verified, stored, typed correctly |
| Cart cleared by `payment.succeeded` | yes, and only the paying customer's |
| Order history, typed status filters | `succeeded` 3, `failed` 0 |
| Invoice download | real 52K PDF |
| Membership subscribe | active, $9.00/month |
| Pause, resume | `active -> paused -> active` |
| In-app checkout and deep-link return | sheet dismisses, cart refreshes |

Not verified: refunds. The API returns `409 Insufficient funds in wallet` because
a test-mode payment has not settled, so there is no balance to refund from. The
route, its error mapping and the app's confirmation dialog are in place and the
call reaches the API; only the API-side outcome is untested.

## Two SDK findings

Running this against the live API surfaced two problems in the published Rust SDK:

1. **`SubscriptionsUpdateParams.pause` is stale.** Sending it returns
   `422 pause was removed; use status: paused or status: active instead`. Anyone
   pausing a subscription through the SDK's own field gets a 422.
2. **`price` has two shapes.** `GET /products` returns a flat integer;
   `GET /products/{id}` returns an object whose own `price` field holds it. One
   field name, two types, which is why the generated `Price` is an untagged enum
   of `serde_json::Value`.

## Design

See [docs/2026-09-10-palette-design.md](docs/2026-09-10-palette-design.md) for the
full design, including why the catalog is digital (Dodo is a Merchant of Record and
supports no physical tax category) and why there is no reconciliation layer.
