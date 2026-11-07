// A Glossa translator module in JavaScript.
//
// Glossa calls translate(req, host) with
//   req = { text, from, to, style?, glossary?, options }
// and expects { text, detected_from? } back (docs/modules/protocol.md).
// `host.fetch` is synchronous: no callbacks, no await needed.
//
// Editors that read jsconfig.json (VS Code, WebStorm) type `req` and `host`
// from glossa.d.ts; the JSDoc tags below name the types.

/**
 * @param {Glossa.TranslateRequest} req
 * @param {Glossa.Host} host
 * @returns {Glossa.TranslateResult}
 */
function translate(req, host) {
  var key = req.options.api_key;
  // An empty required setting: Glossa tells the user to fill in api_key.
  if (!key) throw new ModuleError("missing_credential", "api_key");

  var r = host.fetch("https://api.example.com/v1/translate", {
    method: "POST",
    headers: { Authorization: "Bearer " + key },
    json: { text: req.text, source: req.from === "auto" ? null : req.from, target: req.to },
    timeout: 15000 // below Glossa's 30 s budget, so a slow service fails clearly
  });

  // A non-2xx status is returned, not thrown: map it to a typed error.
  if (r.status === 401 || r.status === 403) throw new ModuleError("missing_credential", "api_key");
  if (r.status === 429) throw new ModuleError("rate_limited", "the Example API asks to slow down");
  if (!r.ok) throw new ModuleError("http", "the Example API answered " + r.status);

  var data = r.json(); // throws bad_response when the body is not JSON
  if (!data.translation) throw new ModuleError("bad_response", "no translation in the answer");
  return { text: data.translation, detected_from: data.detected_source || undefined };
}
