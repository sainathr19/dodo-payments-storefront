use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use dodopayments::models::{CheckoutSessionPreviewResponse, Discount};
use serde::Deserialize;

use crate::checkout::checkout_params;
use crate::error::ApiResult;
use crate::state::AppState;
use crate::store::{self, CartItem};

pub const RETURN_URL: &str = "palette://checkout-return";

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/cart", get(show).post(add))
        .route("/cart/{product_id}", delete(remove))
        .route("/cart/preview", post(preview))
        .route("/discounts/{code}", get(lookup_discount))
}

#[derive(Deserialize)]
pub struct CustomerQuery {
    pub customer_id: String,
}

#[derive(Deserialize)]
pub struct AddBody {
    pub customer_id: String,
    pub product_id: String,
    pub quantity: i64,
}

#[derive(Deserialize)]
pub struct PreviewBody {
    pub customer_id: String,
    pub promo_code: Option<String>,
}

async fn show(
    State(state): State<Arc<AppState>>,
    Query(q): Query<CustomerQuery>,
) -> Json<Vec<CartItem>> {
    let db = state.db.lock().expect("db mutex");
    Json(store::cart_get(&db, &q.customer_id).unwrap_or_default())
}

async fn add(State(state): State<Arc<AppState>>, Json(b): Json<AddBody>) -> Json<Vec<CartItem>> {
    let db = state.db.lock().expect("db mutex");
    let _ = store::cart_put(&db, &b.customer_id, &b.product_id, b.quantity);
    Json(store::cart_get(&db, &b.customer_id).unwrap_or_default())
}

async fn remove(
    State(state): State<Arc<AppState>>,
    Path(product_id): Path<String>,
    Query(q): Query<CustomerQuery>,
) -> Json<Vec<CartItem>> {
    let db = state.db.lock().expect("db mutex");
    let _ = store::cart_remove(&db, &q.customer_id, &product_id);
    Json(store::cart_get(&db, &q.customer_id).unwrap_or_default())
}

async fn preview(
    State(state): State<Arc<AppState>>,
    Json(b): Json<PreviewBody>,
) -> ApiResult<Json<CheckoutSessionPreviewResponse>> {
    // The lock is dropped before the await: a std Mutex guard must never be
    // held across an await point.
    let items = {
        let db = state.db.lock().expect("db mutex");
        store::cart_get(&db, &b.customer_id).unwrap_or_default()
    };
    let params = checkout_params(&items, &b.customer_id, b.promo_code.as_deref(), RETURN_URL);
    Ok(Json(state.dodo.checkout_sessions().preview(params).await?))
}

async fn lookup_discount(
    State(state): State<Arc<AppState>>,
    Path(code): Path<String>,
) -> ApiResult<Json<Discount>> {
    Ok(Json(state.dodo.discounts().retrieve_by_code(&code).await?))
}
