use rusqlite::{params, Connection};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct CartItem {
    pub product_id: String,
    pub quantity: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct LoggedEvent {
    pub webhook_id: String,
    pub event_type: String,
    pub payload: String,
    pub received_at: String,
}

pub fn init(db: &Connection) -> rusqlite::Result<()> {
    db.execute_batch(
        "CREATE TABLE IF NOT EXISTS webhook_events (
             webhook_id  TEXT PRIMARY KEY,
             event_type  TEXT NOT NULL,
             payload     TEXT NOT NULL,
             received_at TEXT NOT NULL
         );
         CREATE TABLE IF NOT EXISTS cart_items (
             customer_id TEXT NOT NULL,
             product_id  TEXT NOT NULL,
             quantity    INTEGER NOT NULL,
             PRIMARY KEY (customer_id, product_id)
         );",
    )
}

pub fn cart_get(db: &Connection, customer_id: &str) -> rusqlite::Result<Vec<CartItem>> {
    let mut stmt = db.prepare(
        "SELECT product_id, quantity FROM cart_items WHERE customer_id = ?1 ORDER BY product_id",
    )?;
    let rows = stmt.query_map(params![customer_id], |r| {
        Ok(CartItem {
            product_id: r.get(0)?,
            quantity: r.get(1)?,
        })
    })?;
    rows.collect()
}

pub fn cart_put(
    db: &Connection,
    customer_id: &str,
    product_id: &str,
    quantity: i64,
) -> rusqlite::Result<()> {
    db.execute(
        "INSERT INTO cart_items (customer_id, product_id, quantity) VALUES (?1, ?2, ?3)
         ON CONFLICT(customer_id, product_id) DO UPDATE SET quantity = excluded.quantity",
        params![customer_id, product_id, quantity],
    )?;
    Ok(())
}

pub fn cart_remove(db: &Connection, customer_id: &str, product_id: &str) -> rusqlite::Result<()> {
    db.execute(
        "DELETE FROM cart_items WHERE customer_id = ?1 AND product_id = ?2",
        params![customer_id, product_id],
    )?;
    Ok(())
}

pub fn cart_clear(db: &Connection, customer_id: &str) -> rusqlite::Result<()> {
    db.execute(
        "DELETE FROM cart_items WHERE customer_id = ?1",
        params![customer_id],
    )?;
    Ok(())
}

/// Returns false when this `webhook_id` was already stored, which is how a
/// retried delivery is distinguished from a new one.
pub fn event_log(db: &Connection, e: &LoggedEvent) -> rusqlite::Result<bool> {
    let changed = db.execute(
        "INSERT OR IGNORE INTO webhook_events (webhook_id, event_type, payload, received_at)
         VALUES (?1, ?2, ?3, ?4)",
        params![e.webhook_id, e.event_type, e.payload, e.received_at],
    )?;
    Ok(changed == 1)
}

pub fn events_recent(db: &Connection, limit: i64) -> rusqlite::Result<Vec<LoggedEvent>> {
    let mut stmt = db.prepare(
        "SELECT webhook_id, event_type, payload, received_at FROM webhook_events
         ORDER BY received_at DESC, rowid DESC LIMIT ?1",
    )?;
    let rows = stmt.query_map(params![limit], |r| {
        Ok(LoggedEvent {
            webhook_id: r.get(0)?,
            event_type: r.get(1)?,
            payload: r.get(2)?,
            received_at: r.get(3)?,
        })
    })?;
    rows.collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn db() -> Connection {
        let c = Connection::open_in_memory().unwrap();
        init(&c).unwrap();
        c
    }

    #[test]
    fn putting_the_same_product_twice_replaces_the_quantity() {
        let c = db();
        cart_put(&c, "cus_1", "pdt_a", 1).unwrap();
        cart_put(&c, "cus_1", "pdt_a", 3).unwrap();
        let items = cart_get(&c, "cus_1").unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].quantity, 3);
    }

    #[test]
    fn carts_are_isolated_per_customer() {
        let c = db();
        cart_put(&c, "cus_1", "pdt_a", 1).unwrap();
        cart_put(&c, "cus_2", "pdt_b", 1).unwrap();
        assert_eq!(cart_get(&c, "cus_1").unwrap().len(), 1);
        assert_eq!(cart_get(&c, "cus_1").unwrap()[0].product_id, "pdt_a");
    }

    #[test]
    fn clearing_one_cart_leaves_the_other_alone() {
        let c = db();
        cart_put(&c, "cus_1", "pdt_a", 1).unwrap();
        cart_put(&c, "cus_2", "pdt_b", 1).unwrap();
        cart_clear(&c, "cus_1").unwrap();
        assert!(cart_get(&c, "cus_1").unwrap().is_empty());
        assert_eq!(cart_get(&c, "cus_2").unwrap().len(), 1);
    }

    #[test]
    fn removing_a_product_leaves_the_rest() {
        let c = db();
        cart_put(&c, "cus_1", "pdt_a", 1).unwrap();
        cart_put(&c, "cus_1", "pdt_b", 2).unwrap();
        cart_remove(&c, "cus_1", "pdt_a").unwrap();
        let items = cart_get(&c, "cus_1").unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].product_id, "pdt_b");
    }

    fn event(id: &str) -> LoggedEvent {
        LoggedEvent {
            webhook_id: id.to_string(),
            event_type: "payment.succeeded".to_string(),
            payload: "{}".to_string(),
            received_at: "2026-09-10T00:00:00Z".to_string(),
        }
    }

    /// Dodo retries on any non-2xx, so the same webhook-id will arrive twice.
    #[test]
    fn logging_the_same_webhook_id_twice_stores_one_row() {
        let c = db();
        assert!(event_log(&c, &event("msg_1")).unwrap());
        assert!(!event_log(&c, &event("msg_1")).unwrap());
        assert_eq!(events_recent(&c, 10).unwrap().len(), 1);
    }

    #[test]
    fn recent_events_come_back_newest_first_and_respect_the_limit() {
        let c = db();
        for i in 0..5 {
            let mut e = event(&format!("msg_{i}"));
            e.received_at = format!("2026-09-10T00:00:0{i}Z");
            event_log(&c, &e).unwrap();
        }
        let got = events_recent(&c, 3).unwrap();
        assert_eq!(got.len(), 3);
        assert_eq!(got[0].webhook_id, "msg_4");
    }
}
