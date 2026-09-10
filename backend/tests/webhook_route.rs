use axum::body::Body;
use axum::http::{Request, StatusCode};
use standardwebhooks::Webhook;
use tower::ServiceExt;

const KEY: &str = "whsec_C2FVsBQIhrscChlQIMV+b5sSYspob7oD";

const PAYMENT: &str = r#"{"business_id":"biz_1","timestamp":"2026-09-10T00:00:00Z","type":"payment.succeeded","data":{"billing":{"country":"US"},"brand_id":"b","business_id":"biz_1","created_at":"t","currency":"USD","customer":{"customer_id":"cus_1","email":"e@x.com","name":"N"},"digital_products_delivered":false,"disputes":[],"is_update_payment_method":false,"metadata":{},"payment_id":"pay_1","payment_provider":"stripe","retry_attempt":0,"refunds":[],"settlement_amount":100,"settlement_currency":"USD","total_amount":100,"payload_type":"Payment"}}"#;

fn now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

fn signed_request(body: &str, msg_id: &str) -> Request<Body> {
    let wh = Webhook::new(KEY).unwrap();
    let at = now();
    let sig = wh.sign(msg_id, at, body.as_bytes()).unwrap();
    Request::builder()
        .method("POST")
        .uri("/webhook")
        .header("webhook-id", msg_id)
        .header("webhook-timestamp", at.to_string())
        .header("webhook-signature", sig)
        .body(Body::from(body.to_string()))
        .unwrap()
}

#[tokio::test]
async fn a_validly_signed_webhook_is_accepted_and_logged() {
    let app = palette_backend::test_app(KEY);
    let res = app
        .clone()
        .oneshot(signed_request(PAYMENT, "msg_1"))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let res = app
        .oneshot(
            Request::builder()
                .uri("/events")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let events: serde_json::Value = serde_json::from_slice(&bytes).unwrap();

    // Assert on the classified `event_type`, not on the raw payload: the payload
    // contains the string "payment.succeeded" regardless of how the SDK typed
    // the event, so matching against it would pass even on a misclassification.
    assert_eq!(events.as_array().unwrap().len(), 1);
    assert_eq!(events[0]["event_type"], "payment.succeeded");
    assert_eq!(events[0]["webhook_id"], "msg_1");
}

#[tokio::test]
async fn a_tampered_body_is_rejected_and_not_logged() {
    let app = palette_backend::test_app(KEY);
    let mut req = signed_request(PAYMENT, "msg_2");
    *req.body_mut() = Body::from(PAYMENT.replace("\"total_amount\":100", "\"total_amount\":1"));
    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    let res = app
        .oneshot(
            Request::builder()
                .uri("/events")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    assert!(!String::from_utf8(bytes.to_vec())
        .unwrap()
        .contains("payment.succeeded"));
}

#[tokio::test]
async fn a_retried_delivery_is_accepted_but_stored_once() {
    let app = palette_backend::test_app(KEY);
    for _ in 0..2 {
        let res = app
            .clone()
            .oneshot(signed_request(PAYMENT, "msg_3"))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }
    let res = app
        .oneshot(
            Request::builder()
                .uri("/events")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let events: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(events.as_array().unwrap().len(), 1);
}
