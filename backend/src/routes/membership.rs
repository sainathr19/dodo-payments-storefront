use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use dodopayments::models::{
    CheckoutSessionResponse, Subscription, SubscriptionListResponse, SubscriptionStatus,
    SubscriptionsUpdateParams,
};
use serde::Deserialize;

use crate::checkout::checkout_params;
use crate::error::ApiResult;
use crate::routes::cart::RETURN_URL;
use crate::state::AppState;
use crate::store::CartItem;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/membership", get(list))
        .route("/membership/subscribe", post(subscribe))
        .route("/membership/{id}/{action}", post(act))
}

#[derive(Deserialize)]
pub struct CustomerQuery {
    pub customer_id: String,
}

#[derive(Deserialize)]
pub struct SubscribeBody {
    pub customer_id: String,
}

/// Pure: maps an action name to the update the API needs, so the mapping is
/// tested without a network call.
///
/// The SDK still exposes `pause: Option<bool>`, but the live API rejects it with
/// `422 pause was removed; use status: paused or status: active instead`. The
/// generated model is behind the API, so this uses `status` and leaves `pause`
/// untouched.
pub fn update_for_action(action: &str) -> Option<SubscriptionsUpdateParams> {
    match action {
        "pause" => Some(SubscriptionsUpdateParams {
            status: Some(Box::new(SubscriptionStatus::Paused)),
            ..Default::default()
        }),
        "resume" => Some(SubscriptionsUpdateParams {
            status: Some(Box::new(SubscriptionStatus::Active)),
            ..Default::default()
        }),
        // Ending at period end rather than immediately, so paid-for time is not
        // stranded.
        "cancel" => Some(SubscriptionsUpdateParams {
            cancel_at_next_billing_date: Some(true),
            ..Default::default()
        }),
        _ => None,
    }
}

async fn list(
    State(state): State<Arc<AppState>>,
    Query(q): Query<CustomerQuery>,
) -> ApiResult<Json<Vec<SubscriptionListResponse>>> {
    let page = state
        .dodo
        .subscriptions()
        .list()
        .customer_id(&q.customer_id)
        .send()
        .await?;
    Ok(Json(page.items))
}

/// The membership is bought through the same checkout session as anything else,
/// with a cart of exactly one recurring product.
async fn subscribe(
    State(state): State<Arc<AppState>>,
    Json(b): Json<SubscribeBody>,
) -> ApiResult<Json<CheckoutSessionResponse>> {
    let item = CartItem {
        product_id: state.seed.membership_product_id.clone(),
        quantity: 1,
    };
    let params = checkout_params(&[item], &b.customer_id, None, RETURN_URL);
    Ok(Json(state.dodo.checkout_sessions().create(params).await?))
}

async fn act(
    State(state): State<Arc<AppState>>,
    Path((id, action)): Path<(String, String)>,
) -> Result<Json<Subscription>, (StatusCode, String)> {
    let params = update_for_action(&action)
        .ok_or((StatusCode::BAD_REQUEST, format!("unknown action: {action}")))?;
    state
        .dodo
        .subscriptions()
        .update(&id, params)
        .await
        .map(Json)
        .map_err(|e| {
            let (status, body) = crate::error::describe(&e);
            (
                StatusCode::from_u16(status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
                body.message,
            )
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The API removed the `pause` boolean; sending it returns 422. These two
    /// tests pin the replacement so a future edit cannot quietly reintroduce it.
    #[test]
    fn pause_sets_the_status_to_paused_and_never_the_removed_flag() {
        let p = update_for_action("pause").unwrap();
        assert!(matches!(
            p.status.as_deref(),
            Some(SubscriptionStatus::Paused)
        ));
        assert_eq!(p.pause, None, "the removed `pause` field must not be sent");
        assert_eq!(p.cancel_at_next_billing_date, None);
    }

    #[test]
    fn resume_sets_the_status_back_to_active() {
        let p = update_for_action("resume").unwrap();
        assert!(matches!(
            p.status.as_deref(),
            Some(SubscriptionStatus::Active)
        ));
        assert_eq!(p.pause, None, "the removed `pause` field must not be sent");
    }

    #[test]
    fn cancel_schedules_the_end_rather_than_stopping_now() {
        let p = update_for_action("cancel").unwrap();
        assert_eq!(p.cancel_at_next_billing_date, Some(true));
        assert_eq!(p.pause, None);
    }

    #[test]
    fn an_unknown_action_is_rejected() {
        assert!(update_for_action("explode").is_none());
    }
}
