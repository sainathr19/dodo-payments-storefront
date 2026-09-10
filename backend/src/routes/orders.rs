use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::http::header;
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{Json, Router};
use dodopayments::models::{IntentStatus, PaymentListResponse, Refund, RefundsCreateParams};
use serde::Deserialize;

use crate::error::ApiResult;
use crate::state::AppState;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/orders", get(list))
        .route("/orders/{id}/invoice", get(invoice))
        .route("/orders/{id}/refund", post(refund))
}

#[derive(Deserialize)]
pub struct OrdersQuery {
    pub customer_id: String,
    /// Optional filter, using the API's own status spelling.
    pub status: Option<String>,
}

/// The typed filter is the point: an unrecognised status is rejected here
/// rather than silently ignored by the API.
fn parse_status(s: &str) -> Option<IntentStatus> {
    match s {
        "succeeded" => Some(IntentStatus::Succeeded),
        "failed" => Some(IntentStatus::Failed),
        "cancelled" => Some(IntentStatus::Cancelled),
        "processing" => Some(IntentStatus::Processing),
        "requires_customer_action" => Some(IntentStatus::RequiresCustomerAction),
        "requires_payment_method" => Some(IntentStatus::RequiresPaymentMethod),
        _ => None,
    }
}

async fn list(
    State(state): State<Arc<AppState>>,
    Query(q): Query<OrdersQuery>,
) -> ApiResult<Json<Vec<PaymentListResponse>>> {
    let mut builder = state.dodo.payments().list().customer_id(&q.customer_id);
    if let Some(parsed) = q.status.as_deref().and_then(parse_status) {
        builder = builder.status(parsed);
    }
    Ok(Json(builder.send().await?.items))
}

async fn invoice(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> ApiResult<impl IntoResponse> {
    let pdf = state.dodo.invoices().payments().retrieve(&id).await?;
    Ok((
        [
            (header::CONTENT_TYPE, "application/pdf"),
            (
                header::CONTENT_DISPOSITION,
                "inline; filename=\"invoice.pdf\"",
            ),
        ],
        pdf,
    ))
}

async fn refund(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> ApiResult<Json<Refund>> {
    let mut params = RefundsCreateParams::new(&id);
    params.reason = Some("Requested in app".to_string());
    // A POST: created once, never retried.
    Ok(Json(state.dodo.refunds().create(params).await?))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_statuses_map_to_the_typed_enum() {
        assert!(matches!(
            parse_status("succeeded"),
            Some(IntentStatus::Succeeded)
        ));
        assert!(matches!(parse_status("failed"), Some(IntentStatus::Failed)));
        assert!(matches!(
            parse_status("processing"),
            Some(IntentStatus::Processing)
        ));
    }

    #[test]
    fn an_unknown_status_is_rejected_rather_than_guessed() {
        assert!(parse_status("nonsense").is_none());
        assert!(parse_status("").is_none());
    }
}
