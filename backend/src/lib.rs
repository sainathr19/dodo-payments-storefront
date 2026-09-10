pub mod config;
pub mod error;
pub mod routes;
pub mod state;
pub mod store;

use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::{routing::get, Router};
use dodopayments::{Client, Environment};
use rusqlite::Connection;

use crate::state::AppState;

pub fn build_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(|| async { "ok" }))
        .merge(routes::webhooks::router())
        .with_state(state)
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
    }))
}

pub fn test_app(webhook_key: &str) -> Router {
    test_app_inner(webhook_key, |_| {})
}
