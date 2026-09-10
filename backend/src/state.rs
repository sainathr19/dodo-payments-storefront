use std::sync::Mutex;

use dodopayments::Client;
use rusqlite::Connection;

use crate::seed::Seed;

pub struct AppState {
    pub dodo: Client,
    pub db: Mutex<Connection>,
    pub seed: Seed,
}
