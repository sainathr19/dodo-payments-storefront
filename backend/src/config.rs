use anyhow::{anyhow, Result};

#[derive(Debug, Clone)]
pub struct Config {
    pub api_key: String,
    pub webhook_key: String,
    pub port: u16,
    pub db_path: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        Self::from_values(
            std::env::var("DODO_PAYMENTS_API_KEY").ok(),
            std::env::var("DODO_PAYMENTS_WEBHOOK_KEY").ok(),
            std::env::var("PORT").ok(),
            std::env::var("DB_PATH").ok(),
        )
    }

    /// Split from `from_env` so the fallbacks are testable without touching
    /// process environment, which tests share and cannot isolate.
    pub fn from_values(
        api_key: Option<String>,
        webhook_key: Option<String>,
        port: Option<String>,
        db_path: Option<String>,
    ) -> Result<Self> {
        Ok(Self {
            api_key: api_key.ok_or_else(|| anyhow!("DODO_PAYMENTS_API_KEY is not set"))?,
            webhook_key: webhook_key
                .ok_or_else(|| anyhow!("DODO_PAYMENTS_WEBHOOK_KEY is not set"))?,
            port: port.as_deref().unwrap_or("8080").parse()?,
            db_path: db_path.unwrap_or_else(|| "store.db".to_string()),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn port_falls_back_to_8080_when_unset() {
        let c = Config::from_values(Some("k".into()), Some("w".into()), None, None).unwrap();
        assert_eq!(c.port, 8080);
        assert_eq!(c.db_path, "store.db");
    }

    #[test]
    fn a_missing_api_key_is_an_error_naming_the_variable() {
        let err = Config::from_values(None, Some("w".into()), None, None).unwrap_err();
        assert!(err.to_string().contains("DODO_PAYMENTS_API_KEY"));
    }

    #[test]
    fn a_missing_webhook_key_is_an_error_naming_the_variable() {
        let err = Config::from_values(Some("k".into()), None, None, None).unwrap_err();
        assert!(err.to_string().contains("DODO_PAYMENTS_WEBHOOK_KEY"));
    }
}
