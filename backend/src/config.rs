use anyhow::{anyhow, Result};

#[derive(Debug, Clone)]
pub struct Config {
    pub api_key: String,
    pub webhook_key: String,
    pub port: u16,
    pub db_path: String,
}

/// `std::env::var` reports a variable set to the empty string as present, but a
/// blank secret is a misconfiguration, not a value. Treating it as absent makes
/// `DODO_PAYMENTS_WEBHOOK_KEY=` fail at startup naming the variable, rather than
/// starting a server whose every signature check fails for an opaque reason.
fn var(name: &str) -> Option<String> {
    std::env::var(name)
        .ok()
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

impl Config {
    pub fn from_env() -> Result<Self> {
        Self::from_values(
            var("DODO_PAYMENTS_API_KEY"),
            var("DODO_PAYMENTS_WEBHOOK_KEY"),
            var("PORT"),
            var("DB_PATH"),
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
            api_key: api_key
                .filter(|v| !v.trim().is_empty())
                .ok_or_else(|| anyhow!("DODO_PAYMENTS_API_KEY is not set"))?,
            webhook_key: webhook_key
                .filter(|v| !v.trim().is_empty())
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
    fn an_empty_value_counts_as_unset() {
        std::env::set_var("PALETTE_TEST_BLANK", "   ");
        assert_eq!(var("PALETTE_TEST_BLANK"), None);
        std::env::set_var("PALETTE_TEST_BLANK", "");
        assert_eq!(var("PALETTE_TEST_BLANK"), None);
        std::env::set_var("PALETTE_TEST_BLANK", " abc ");
        assert_eq!(var("PALETTE_TEST_BLANK").as_deref(), Some("abc"));
        std::env::remove_var("PALETTE_TEST_BLANK");
    }

    #[test]
    fn a_blank_webhook_key_is_rejected_like_a_missing_one() {
        let err = Config::from_values(Some("k".into()), Some("".into()), None, None);
        assert!(err.is_err(), "a blank webhook key must not be accepted");
    }

    #[test]
    fn a_missing_webhook_key_is_an_error_naming_the_variable() {
        let err = Config::from_values(Some("k".into()), None, None, None).unwrap_err();
        assert!(err.to_string().contains("DODO_PAYMENTS_WEBHOOK_KEY"));
    }
}
