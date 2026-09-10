use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use dodopayments::Error as SdkError;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ErrorBody {
    pub message: String,
    pub request_id: Option<String>,
}

pub struct ApiFailure(pub SdkError);

impl From<SdkError> for ApiFailure {
    fn from(e: SdkError) -> Self {
        ApiFailure(e)
    }
}

pub type ApiResult<T> = std::result::Result<T, ApiFailure>;

/// Split out so the mapping is testable without building a `Response`.
pub fn describe(e: &SdkError) -> (u16, ErrorBody) {
    match e {
        // A `request_id` is the only thing that makes a support conversation
        // with Dodo possible, so it is never dropped.
        SdkError::Api(api) => (
            api.status,
            ErrorBody {
                message: api.message.clone(),
                request_id: api.request_id.clone(),
            },
        ),
        SdkError::WebhookVerification(m) => (
            400,
            ErrorBody {
                message: format!("webhook verification failed: {m}"),
                request_id: None,
            },
        ),
        SdkError::InvalidPathParam { param, .. } => (
            400,
            ErrorBody {
                message: format!("invalid path parameter: {param}"),
                request_id: None,
            },
        ),
        SdkError::InvalidQueryParam { param, .. } => (
            400,
            ErrorBody {
                message: format!("invalid query parameter: {param}"),
                request_id: None,
            },
        ),
        SdkError::Transport(_) => (
            502,
            ErrorBody {
                message: "could not reach Dodo Payments".into(),
                request_id: None,
            },
        ),
        other => (
            500,
            ErrorBody {
                message: other.to_string(),
                request_id: None,
            },
        ),
    }
}

impl IntoResponse for ApiFailure {
    fn into_response(self) -> Response {
        let (status, body) = describe(&self.0);
        let status = StatusCode::from_u16(status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        (status, Json(body)).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn an_api_error_keeps_its_status_and_request_id() {
        let api = dodopayments::ApiError {
            status: 404,
            code: Some("not_found".into()),
            message: "no such payment".into(),
            request_id: Some("req_abc".into()),
            retry_after: None,
            body: String::new(),
        };
        let (status, body) = describe(&dodopayments::Error::Api(api));
        assert_eq!(status, 404);
        assert_eq!(body.request_id.as_deref(), Some("req_abc"));
        assert_eq!(body.message, "no such payment");
    }

    #[test]
    fn a_webhook_verification_failure_is_a_400() {
        let (status, _) = describe(&dodopayments::Error::WebhookVerification("bad".into()));
        assert_eq!(status, 400);
    }

    #[test]
    fn an_invalid_path_param_is_a_400_not_a_500() {
        let e = dodopayments::Error::InvalidPathParam {
            param: "id",
            value: "..".into(),
        };
        let (status, _) = describe(&e);
        assert_eq!(status, 400);
    }
}
