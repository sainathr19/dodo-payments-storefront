use std::sync::Arc;

use axum::body::Bytes;
use axum::extract::State;
use axum::http::HeaderMap;
use axum::routing::{get, post};
use axum::{Json, Router};
use dodopayments::models::UnwrapWebhookEvent;

use crate::error::ApiResult;
use crate::state::AppState;
use crate::store::{self, LoggedEvent};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/webhook", post(receive))
        .route("/events", get(recent))
}

/// The SDK's tagged enum gives the event name back without re-parsing the body.
pub fn event_name(e: &UnwrapWebhookEvent) -> &'static str {
    match e {
        UnwrapWebhookEvent::PaymentSucceededWebhookEvent(_) => "payment.succeeded",
        UnwrapWebhookEvent::PaymentFailedWebhookEvent(_) => "payment.failed",
        UnwrapWebhookEvent::RefundSucceededWebhookEvent(_) => "refund.succeeded",
        UnwrapWebhookEvent::SubscriptionActiveWebhookEvent(_) => "subscription.active",
        UnwrapWebhookEvent::SubscriptionCancelledWebhookEvent(_) => "subscription.cancelled",
        _ => "other",
    }
}

async fn receive(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    body: Bytes,
) -> ApiResult<&'static str> {
    // Nothing is parsed or stored until the signature holds.
    let event = state.dodo.webhooks().verify(&body, &headers)?;

    let webhook_id = headers
        .get("webhook-id")
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default()
        .to_string();

    let logged = LoggedEvent {
        webhook_id,
        event_type: event_name(&event).to_string(),
        payload: String::from_utf8_lossy(&body).to_string(),
        received_at: received_at_now(),
    };

    let db = state.db.lock().expect("db mutex");
    // A duplicate is still a success: Dodo must stop retrying.
    let _first_time = store::event_log(&db, &logged).ok();
    Ok("ok")
}

async fn recent(State(state): State<Arc<AppState>>) -> Json<Vec<LoggedEvent>> {
    let db = state.db.lock().expect("db mutex");
    Json(store::events_recent(&db, 50).unwrap_or_default())
}

fn received_at_now() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // Sorting is what matters here, not display, so seconds-since-epoch
    // zero-padded sorts correctly as text.
    format!("{secs:020}")
}
