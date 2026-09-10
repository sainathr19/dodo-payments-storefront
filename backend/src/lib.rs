pub mod checkout;
pub mod config;
pub mod error;
pub mod routes;
pub mod seed;
pub mod state;
pub mod store;

use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::{routing::get, Router};
use dodopayments::{Client, Environment};
use rusqlite::Connection;
use tower_http::cors::CorsLayer;

use crate::seed::{Seed, SeedCustomer, SeedProduct};
use crate::state::AppState;

pub fn build_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(|| async { "ok" }))
        .merge(routes::products::router())
        .merge(routes::cart::router())
        .merge(routes::checkout::router())
        .merge(routes::orders::router())
        .merge(routes::membership::router())
        .merge(routes::webhooks::router())
        // Permissive only because this is a test-mode demo holding no user data.
        // Do not carry this into anything real.
        .layer(CorsLayer::permissive())
        .with_state(state)
}

/// A fixed seed so tests need no `seed.json` on disk.
fn test_seed() -> Seed {
    Seed {
        products: vec![SeedProduct {
            product_id: "pdt_a".into(),
            name: "Aurora Icon Pack".into(),
            price_cents: 1900,
        }],
        membership_product_id: "pdt_pro".into(),
        customers: vec![SeedCustomer {
            customer_id: "cus_1".into(),
            name: "Ada Lovelace".into(),
            email: "ada@example.com".into(),
        }],
        promo_code: "PALETTE20".into(),
    }
}

/// Shared construction, so the test helpers cannot drift apart. `prepare` runs
/// against the fresh connection before the router is built.
fn test_app_inner(webhook_key: &str, prepare: impl FnOnce(&Connection)) -> Router {
    // The API key is a placeholder: these tests never reach the network, only
    // the webhook path, which needs the signing key alone.
    let dodo = Client::builder(Environment::TestMode.base_url(), "placeholder")
        .webhook_key(webhook_key)
        .timeout(Duration::from_secs(5))
        .build()
        .expect("client builds");
    let db = Connection::open_in_memory().expect("memory db opens");
    store::init(&db).expect("schema applies");
    prepare(&db);
    build_router(Arc::new(AppState {
        dodo,
        db: Mutex::new(db),
        seed: test_seed(),
    }))
}

pub fn test_app(webhook_key: &str) -> Router {
    test_app_inner(webhook_key, |_| {})
}

/// Same as `test_app`, with one cart row pre-loaded.
pub fn test_app_with_cart(
    webhook_key: &str,
    customer_id: &str,
    product_id: &str,
    qty: i64,
) -> Router {
    let (customer_id, product_id) = (customer_id.to_string(), product_id.to_string());
    test_app_inner(webhook_key, move |db| {
        store::cart_put(db, &customer_id, &product_id, qty).expect("cart row inserts");
    })
}
