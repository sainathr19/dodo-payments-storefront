use std::sync::Mutex;

use dodopayments::Client;
use rusqlite::Connection;

pub struct AppState {
    pub dodo: Client,
    pub db: Mutex<Connection>,
}
