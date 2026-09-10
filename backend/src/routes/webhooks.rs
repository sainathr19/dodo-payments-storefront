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

/// The SDK's tagged enum gives the event name back without re-parsing the body,
/// which is the whole point of the fork's `#[serde(tag = "type")]` fix: on the
/// published SDK an untagged enum matches the first structurally-compatible
/// variant, so `payment.succeeded` arrives as an abandoned-checkout event.
///
/// `UnwrapWebhookEvent` is `#[non_exhaustive]` with 48 variants; the ones this
/// storefront can act on or display are named, and the rest fall through.
pub fn event_name(e: &UnwrapWebhookEvent) -> &'static str {
    match e {
        UnwrapWebhookEvent::PaymentSucceededWebhookEvent(_) => "payment.succeeded",
        UnwrapWebhookEvent::PaymentFailedWebhookEvent(_) => "payment.failed",
        UnwrapWebhookEvent::PaymentCancelledWebhookEvent(_) => "payment.cancelled",
        UnwrapWebhookEvent::PaymentProcessingWebhookEvent(_) => "payment.processing",
        UnwrapWebhookEvent::RefundSucceededWebhookEvent(_) => "refund.succeeded",
        UnwrapWebhookEvent::RefundFailedWebhookEvent(_) => "refund.failed",
        UnwrapWebhookEvent::SubscriptionActiveWebhookEvent(_) => "subscription.active",
        UnwrapWebhookEvent::SubscriptionRenewedWebhookEvent(_) => "subscription.renewed",
        UnwrapWebhookEvent::SubscriptionUpdatedWebhookEvent(_) => "subscription.updated",
        UnwrapWebhookEvent::SubscriptionPausedWebhookEvent(_) => "subscription.paused",
        UnwrapWebhookEvent::SubscriptionUnpausedWebhookEvent(_) => "subscription.unpaused",
        UnwrapWebhookEvent::SubscriptionCancelledWebhookEvent(_) => "subscription.cancelled",
        UnwrapWebhookEvent::SubscriptionExpiredWebhookEvent(_) => "subscription.expired",
        UnwrapWebhookEvent::SubscriptionFailedWebhookEvent(_) => "subscription.failed",
        UnwrapWebhookEvent::SubscriptionOnHoldWebhookEvent(_) => "subscription.on_hold",
        UnwrapWebhookEvent::SubscriptionPastDueWebhookEvent(_) => "subscription.past_due",
        UnwrapWebhookEvent::SubscriptionPlanChangedWebhookEvent(_) => "subscription.plan_changed",
        // An event type this build does not name. It was still verified and
        // stored, so nothing is lost.
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
    let first_time = store::event_log(&db, &logged).unwrap_or(false);

    // Clearing only on the first delivery keeps a retry from wiping a cart the
    // customer has since refilled.
    if first_time {
        if let UnwrapWebhookEvent::PaymentSucceededWebhookEvent(e) = &event {
            let _ = store::cart_clear(&db, &e.data.customer.customer_id);
        }
    }
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
