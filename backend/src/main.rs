use std::sync::{Arc, Mutex};
use std::time::Duration;

use dodopayments::{Client, Environment};
use palette_backend::{build_router, config::Config, state::AppState, store};
use rusqlite::Connection;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt::init();

    let config = Config::from_env()?;

    // Both keys are read once at startup so a misconfigured process fails
    // loudly rather than on the first webhook.
    let dodo = Client::builder(Environment::TestMode.base_url(), config.api_key.clone())
        .webhook_key(config.webhook_key.clone())
        .timeout(Duration::from_secs(30))
        .build()?;

    let db = Connection::open(&config.db_path)?;
    store::init(&db)?;

    let app = build_router(Arc::new(AppState {
        dodo,
        db: Mutex::new(db),
    }));

    let addr = format!("0.0.0.0:{}", config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!(%addr, "listening");
    axum::serve(listener, app).await?;
    Ok(())
}
