use std::sync::Arc;

use axum::extract::State;
use axum::routing::post;
use axum::{Json, Router};
use dodopayments::models::CheckoutSessionResponse;
use serde::Deserialize;

use crate::checkout::checkout_params;
use crate::error::ApiResult;
use crate::routes::cart::RETURN_URL;
use crate::state::AppState;
use crate::store;

pub fn router() -> Router<Arc<AppState>> {
    Router::new().route("/checkout", post(create))
}

#[derive(Deserialize)]
pub struct CheckoutBody {
    pub customer_id: String,
    pub promo_code: Option<String>,
    /// Where Dodo should send the browser once payment completes. The client
    /// supplies it because the correct value differs per build: a standalone
    /// app registers `palette://`, while Expo Go serves a
    /// `exp://<host>:8081/--/...` URL. Hardcoding either one strands the other.
    pub return_url: Option<String>,
}

async fn create(
    State(state): State<Arc<AppState>>,
    Json(b): Json<CheckoutBody>,
) -> ApiResult<Json<CheckoutSessionResponse>> {
    let items = {
        let db = state.db.lock().expect("db mutex");
        store::cart_get(&db, &b.customer_id).unwrap_or_default()
    };

    let return_url = b.return_url.as_deref().unwrap_or(RETURN_URL);
    // Logged because a wrong return URL fails only at the very end of checkout,
    // after payment, where it is expensive to diagnose.
    tracing::info!(customer = %b.customer_id, %return_url, items = items.len(), "creating checkout session");
    let params = checkout_params(&items, &b.customer_id, b.promo_code.as_deref(), return_url);

    // No retry wrapper here, and none anywhere above: this is a POST that can
    // create a charge, and repeating it can charge twice.
    Ok(Json(state.dodo.checkout_sessions().create(params).await?))
}
