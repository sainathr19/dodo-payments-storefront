use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeedProduct {
    pub product_id: String,
    pub name: String,
    pub price_cents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeedCustomer {
    pub customer_id: String,
    pub name: String,
    pub email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Seed {
    pub products: Vec<SeedProduct>,
    pub membership_product_id: String,
    pub customers: Vec<SeedCustomer>,
    pub promo_code: String,
}

impl Seed {
    pub fn load(path: &str) -> anyhow::Result<Self> {
        let text = std::fs::read_to_string(path).map_err(|e| {
            anyhow::anyhow!("could not read {path}: {e}. Run `cargo run --bin seed` first.")
        })?;
        Self::parse(&text)
    }

    pub fn parse(s: &str) -> anyhow::Result<Self> {
        Ok(serde_json::from_str(s)?)
    }

    /// The demo has no authentication, so a customer id arriving from the app is
    /// checked against the seeded set rather than trusted outright.
    pub fn is_known_customer(&self, id: &str) -> bool {
        self.customers.iter().any(|c| c.customer_id == id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE: &str = r#"{
        "products": [{"product_id":"pdt_a","name":"Aurora","price_cents":1900}],
        "membership_product_id": "pdt_pro",
        "customers": [{"customer_id":"cus_1","name":"Ada","email":"ada@example.com"}],
        "promo_code": "PALETTE20"
    }"#;

    #[test]
    fn a_seed_file_parses_into_its_parts() {
        let s = Seed::parse(SAMPLE).unwrap();
        assert_eq!(s.products.len(), 1);
        assert_eq!(s.products[0].price_cents, 1900);
        assert_eq!(s.membership_product_id, "pdt_pro");
        assert_eq!(s.promo_code, "PALETTE20");
    }

    #[test]
    fn only_seeded_customers_are_recognised() {
        let s = Seed::parse(SAMPLE).unwrap();
        assert!(s.is_known_customer("cus_1"));
        assert!(!s.is_known_customer("cus_someone_else"));
    }

    #[test]
    fn a_missing_seed_file_says_how_to_make_one() {
        let err = Seed::load("/nonexistent/seed.json").unwrap_err();
        assert!(err.to_string().contains("cargo run --bin seed"));
    }
}
