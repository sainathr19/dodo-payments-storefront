//! Creates the catalog, three demo customers, and a promo code in the Dodo
//! test account, then writes `seed.json` for the server to read.
//!
//! Safe to re-run: it lists existing products first and only creates what is
//! missing, so a second run does not duplicate the catalog.

use std::time::Duration;

use dodopayments::models::{
    Currency, CustomersCreateParams, DiscountType, DiscountsCreateParams, OneTimePrice, Price,
    ProductListResponse, ProductsCreateParams, RecurringPrice, TaxCategory, TimeInterval,
};
use dodopayments::{Client, Environment};
use serde_json::json;

const PACKS: &[(&str, i64, &str)] = &[
    (
        "Aurora Icon Pack",
        1900,
        "480 line icons, SVG and Figma. Pixel-snapped at 16, 20 and 24.",
    ),
    (
        "Nocturne UI Kit",
        4900,
        "A dark-first component library for Figma. 140 components.",
    ),
    (
        "Grain LUT Collection",
        2400,
        "24 cinematic colour grades for stills and video.",
    ),
    (
        "Meridian Type Specimens",
        1200,
        "Editorial layout templates in InDesign and Figma.",
    ),
];

const MEMBERSHIP: (&str, i64, &str) = (
    "Palette Pro",
    900,
    "Every pack, every month, plus early access to new releases.",
);

const CUSTOMERS: &[(&str, &str)] = &[
    ("Ada Lovelace", "ada@example.com"),
    ("Grace Hopper", "grace@example.com"),
    ("Alan Turing", "alan@example.com"),
];

const PROMO_CODE: &str = "PALETTE20";

/// Seeding only reads the catalog and writes products; it never verifies a
/// webhook, so it deliberately does not require the signing secret.
fn api_key() -> anyhow::Result<String> {
    std::env::var("DODO_PAYMENTS_API_KEY")
        .ok()
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .ok_or_else(|| anyhow::anyhow!("DODO_PAYMENTS_API_KEY is not set"))
}

fn name_of(p: &ProductListResponse) -> String {
    p.name.clone().unwrap_or_default()
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let dodo = Client::builder(Environment::TestMode.base_url(), api_key()?)
        .timeout(Duration::from_secs(30))
        .build()?;

    let existing = dodo.products().list().send().await?;
    println!(
        "catalog currently holds {} product(s)\n",
        existing.items.len()
    );

    let mut products = Vec::new();
    for (name, cents, description) in PACKS {
        if let Some(found) = existing.items.iter().find(|p| name_of(p) == *name) {
            println!("exists   {name} -> {}", found.product_id);
            products.push(json!({
                "product_id": found.product_id, "name": name, "price_cents": cents
            }));
            continue;
        }
        let mut one_time = OneTimePrice::new(*cents, Currency::Usd);
        one_time.tax_inclusive = Some(true);
        let price = Price::OneTimePrice(Box::new(one_time));
        let mut params = ProductsCreateParams::new(*name, price, TaxCategory::DigitalProducts);
        params.description = Some(description.to_string());
        let created = dodo.products().create(params).await?;
        println!("created  {name} -> {}", created.product_id);
        products.push(json!({
            "product_id": created.product_id, "name": name, "price_cents": cents
        }));
    }

    let membership_product_id = match existing.items.iter().find(|p| name_of(p) == MEMBERSHIP.0) {
        Some(found) => {
            println!("exists   {} -> {}", MEMBERSHIP.0, found.product_id);
            found.product_id.clone()
        }
        None => {
            let mut recurring =
                RecurringPrice::new(MEMBERSHIP.1, Currency::Usd, TimeInterval::Month);
            recurring.tax_inclusive = Some(true);
            let price = Price::RecurringPrice(Box::new(recurring));
            let mut params =
                ProductsCreateParams::new(MEMBERSHIP.0, price, TaxCategory::DigitalProducts);
            params.description = Some(MEMBERSHIP.2.to_string());
            let created = dodo.products().create(params).await?;
            println!("created  {} -> {}", MEMBERSHIP.0, created.product_id);
            created.product_id
        }
    };

    println!();
    // Customers are matched on email so a re-run reuses them; creating blindly
    // would add three more demo customers every time this script is executed.
    let existing_customers = dodo.customers().list().send().await?;
    let mut customers = Vec::new();
    for (name, email) in CUSTOMERS {
        let id = match existing_customers.items.iter().find(|c| c.email == *email) {
            Some(found) => {
                println!("exists   {name} -> {}", found.customer_id);
                found.customer_id.clone()
            }
            None => {
                let created = dodo
                    .customers()
                    .create(CustomersCreateParams::new(*email, *name))
                    .await?;
                println!("created  {name} -> {}", created.customer_id);
                created.customer_id
            }
        };
        customers.push(json!({ "customer_id": id, "name": name, "email": email }));
    }

    println!();
    let mut discount = DiscountsCreateParams::new(20_00, DiscountType::Percentage);
    discount.code = Some(PROMO_CODE.to_string());
    discount.name = Some("Launch 20%".to_string());
    match dodo.discounts().create(discount).await {
        Ok(d) => println!(
            "discount {PROMO_CODE} -> {} ({}%)",
            d.discount_id,
            d.amount / 100
        ),
        // Re-running is expected, and a duplicate code is not a failure.
        Err(e) => println!("discount {PROMO_CODE} not created: {e}"),
    }

    let seed = json!({
        "products": products,
        "membership_product_id": membership_product_id,
        "customers": customers,
        "promo_code": PROMO_CODE
    });
    std::fs::write("seed.json", serde_json::to_string_pretty(&seed)?)?;
    println!("\nwrote seed.json");
    Ok(())
}
