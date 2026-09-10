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

## Design

See [docs/2026-09-10-palette-design.md](docs/2026-09-10-palette-design.md) for the
full design, including why the catalog is digital (Dodo is a Merchant of Record and
supports no physical tax category) and why there is no reconciliation layer.
