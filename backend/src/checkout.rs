use dodopayments::models::{
    AttachExistingCustomer, CheckoutSessionsCreateParams, CustomerRequest, Metadata, ProductItemReq,
};
use serde_json::json;

use crate::store::CartItem;

/// Pure: builds the request without sending it, so the mapping from a local
/// cart to Dodo's parameters can be tested without a network or a key.
pub fn checkout_params(
    items: &[CartItem],
    customer_id: &str,
    promo: Option<&str>,
    return_url: &str,
) -> CheckoutSessionsCreateParams {
    let product_cart = items
        .iter()
        .map(|i| ProductItemReq {
            product_id: i.product_id.clone(),
            quantity: i.quantity,
            addons: None,
            amount: None,
            credit_entitlements: None,
        })
        .collect();

    let mut params = CheckoutSessionsCreateParams::new(product_cart);

    // Binding the session to the seeded customer is what makes the payment show
    // up under `payments.list().customer_id(..)`. Without it Dodo creates a
    // fresh customer at checkout and the order history comes back empty.
    params.customer = Some(Box::new(CustomerRequest::AttachExistingCustomer(Box::new(
        AttachExistingCustomer {
            customer_id: customer_id.to_string(),
        },
    ))));

    // Carrying the customer id in metadata too lets a webhook be attributed
    // without re-reading the payment.
    let mut metadata = Metadata::new();
    metadata.insert("customer_id".to_string(), json!(customer_id));
    params.metadata = Some(Box::new(metadata));

    params.return_url = Some(return_url.to_string());
    params.discount_codes = promo.map(|c| vec![c.to_string()]);
    params
}

#[cfg(test)]
mod tests {
    use super::*;

    fn items() -> Vec<CartItem> {
        vec![
            CartItem {
                product_id: "pdt_a".into(),
                quantity: 2,
            },
            CartItem {
                product_id: "pdt_b".into(),
                quantity: 1,
            },
        ]
    }

    #[test]
    fn every_cart_item_becomes_a_product_line_with_its_quantity() {
        let p = checkout_params(&items(), "cus_1", None, "palette://return");
        assert_eq!(p.product_cart.len(), 2);
        assert_eq!(p.product_cart[0].product_id, "pdt_a");
        assert_eq!(p.product_cart[0].quantity, 2);
    }

    #[test]
    fn the_session_attaches_the_existing_customer_rather_than_creating_one() {
        let p = checkout_params(&items(), "cus_1", None, "palette://return");
        match p.customer.as_deref() {
            Some(CustomerRequest::AttachExistingCustomer(c)) => {
                assert_eq!(c.customer_id, "cus_1");
            }
            other => panic!("expected an attached customer, got {other:?}"),
        }
    }

    #[test]
    fn the_customer_id_is_carried_in_metadata_so_webhooks_can_be_attributed() {
        let p = checkout_params(&items(), "cus_1", None, "palette://return");
        let metadata = p.metadata.expect("metadata is set");
        assert_eq!(metadata.get("customer_id").unwrap(), "cus_1");
    }

    #[test]
    fn no_promo_code_means_no_discount_field() {
        let p = checkout_params(&items(), "cus_1", None, "palette://return");
        assert!(p.discount_codes.is_none());
    }

    #[test]
    fn a_promo_code_is_passed_through() {
        let p = checkout_params(&items(), "cus_1", Some("PALETTE20"), "palette://return");
        assert_eq!(p.discount_codes.unwrap(), vec!["PALETTE20".to_string()]);
    }

    #[test]
    fn the_return_url_is_the_apps_deep_link() {
        let p = checkout_params(&items(), "cus_1", None, "palette://return");
        assert_eq!(p.return_url.as_deref(), Some("palette://return"));
    }
}
