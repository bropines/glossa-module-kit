//! A Glossa translator module as a native library.
//!
//! Implement [`Module`] for a `Default` type, override the methods the
//! manifest's `capabilities` promise, and invoke [`export_module!`]: the
//! macro generates the `glossa_module_v1` entry point, the JSON plumbing and
//! the panic guard. The protocol is docs/modules/protocol.md and the ABI
//! docs/modules/native-modules.md in the Glossa repository.

use glossa_module_sdk::wire::*;
use glossa_module_sdk::{export_module, Host, Module};
use serde::Deserialize;

const API_URL: &str = "https://api.example.com/v1/translate";

/// What the Example API answers.
#[derive(Deserialize)]
struct ApiAnswer {
    #[serde(default)]
    translation: String,
    #[serde(default)]
    detected_source: Option<String>,
}

/// The module. One instance lives as long as the library is loaded and the
/// host serialises calls, so `&mut self` state needs no locking.
#[derive(Default)]
pub struct ExampleTranslator;

impl Module for ExampleTranslator {
    fn translate(&mut self, host: &Host, req: TranslateParams) -> Result<TranslateResult, ModuleError> {
        // An empty required setting: Glossa tells the user to fill in api_key.
        let key = req.options.get("api_key").and_then(|v| v.as_str()).unwrap_or_default();
        if key.is_empty() {
            return Err(ModuleError::missing_option("api_key"));
        }

        let source = if req.from == "auto" { serde_json::Value::Null } else { req.from.clone().into() };
        let body = serde_json::json!({ "text": req.text, "source": source, "target": req.to });
        // The http host call goes through Glossa: the user's proxy, the
        // module's network permissions, and a recording in tests. A timeout
        // below Glossa's 30 s budget makes a slow service fail clearly.
        let mut request = HttpRequest::post_json(API_URL, &body).header("Authorization", format!("Bearer {key}"));
        request.timeout_ms = Some(15_000);
        let r = host.http(&request)?;

        // A non-2xx status is returned, not an error: map it to a typed one.
        match r.status {
            401 | 403 => return Err(ModuleError::missing_option("api_key")),
            429 => return Err(ModuleError::new(ErrorKind::RateLimited, "the Example API asks to slow down")),
            s if !r.is_success() => return Err(ModuleError::new(ErrorKind::Http, format!("the Example API answered {s}"))),
            _ => {}
        }
        let answer: ApiAnswer = r.json()?;
        if answer.translation.is_empty() {
            return Err(ModuleError::bad_response("no translation in the answer"));
        }
        host.log(LogLevel::Debug, &format!("translated {} chars", req.text.chars().count()));
        Ok(TranslateResult { detected_from: answer.detected_source, ..TranslateResult::text(answer.translation) })
    }
}

export_module!(ExampleTranslator);

#[cfg(test)]
mod tests {
    #[test]
    fn the_exported_entry_point_speaks_the_sdk_protocol() {
        let table = super::glossa_module_v1();
        // SAFETY: the generated entry point returns a pointer to a static.
        let table = unsafe { &*table };
        assert_eq!(table.protocol_version, glossa_module_sdk::PROTOCOL_VERSION);
    }
}
