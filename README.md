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

## Two SDK findings

Running this against the live API surfaced two problems in the published Rust SDK:

1. **`SubscriptionsUpdateParams.pause` is stale.** Sending it returns
   `422 pause was removed; use status: paused or status: active instead`. Anyone
   pausing a subscription through the SDK's own field gets a 422.
2. **`price` has two shapes.** `GET /products` returns a flat integer;
   `GET /products/{id}` returns an object whose own `price` field holds it. One
   field name, two types, which is why the generated `Price` is an untagged enum
   of `serde_json::Value`. A client that handles only the list shape renders
   `NaN` on the detail screen, which is exactly what this app did until the
   mapper was taught both.

## Design

See [docs/2026-09-10-palette-design.md](docs/2026-09-10-palette-design.md) for the
full design, including why the catalog is digital (Dodo is a Merchant of Record and
supports no physical tax category) and why there is no reconciliation layer.
