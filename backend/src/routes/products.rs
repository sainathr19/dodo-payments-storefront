use std::sync::Arc;

use axum::extract::{Path, State};
use axum::routing::get;
use axum::{Json, Router};
use dodopayments::models::{Product, ProductListResponse};

use crate::error::ApiResult;
use crate::state::AppState;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/products", get(list))
        .route("/products/{id}", get(retrieve))
}

async fn list(State(state): State<Arc<AppState>>) -> ApiResult<Json<Vec<ProductListResponse>>> {
    let page = state.dodo.products().list().send().await?;
    Ok(Json(page.items))
}

async fn retrieve(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> ApiResult<Json<Product>> {
    Ok(Json(state.dodo.products().retrieve(&id).await?))
}
