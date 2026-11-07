// A Glossa translator module in plain Node.js (18 or newer), with no SDK.
//
// The protocol (docs/modules/process-modules.md in the Glossa repository):
//
// * Glossa writes one JSON object per line to stdin:
//     {"id": 7, "method": "translate", "params": {...}}
// * the module answers with one line on stdout:
//     {"id": 7, "result": {...}}  or  {"id": 7, "error": {"kind": "...", "message": "..."}}
// * while handling a request, the module may call back into Glossa with a
//   string id, {"id": "h1", "method": "http", "params": {...}}, and reads
//   {"id": "h1", "result": ...} (also "log", "cache_get", "cache_set", "assets").
//
// stdout is the protocol channel: never print anything else to it.

import { createInterface } from "node:readline";

// Keep console.log off the protocol stream; Glossa logs stderr.
console.log = console.error;

class ModuleError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

// -- the protocol ------------------------------------------------------------

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity })[Symbol.asyncIterator]();

async function nextFrame() {
  for (;;) {
    const { value, done } = await lines.next();
    if (done) return null;
    try {
      const frame = JSON.parse(value);
      if (frame && typeof frame === "object") return frame;
    } catch {
      // not JSON: skip it
    }
  }
}

function send(frame) {
  // One line per frame; process.stdout.write on a pipe is flushed as we go.
  process.stdout.write(JSON.stringify(frame) + "\n");
}

let hostCalls = 0;
async function host(method, params) {
  const id = `h${++hostCalls}`;
  send({ id, method, params });
  for (;;) {
    const frame = await nextFrame();
    if (!frame) throw new ModuleError("other", "Glossa closed the connection");
    if (frame.id !== id) continue;
    if (frame.error) throw new ModuleError(frame.error.kind ?? "other", frame.error.message ?? "");
    return frame.result;
  }
}

// -- the module ----------------------------------------------------------------

const API_URL = "https://api.example.com/v1/translate";

const handlers = {
  async translate(req) {
    const key = req.options?.api_key;
    // An empty required setting: Glossa tells the user to fill in api_key.
    if (!key) throw new ModuleError("missing_credential", "api_key");

    // The http host call goes through Glossa: the user's proxy, the module's
    // network permissions, and a recording in tests.
    const r = await host("http", {
      method: "POST",
      url: API_URL,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: req.text, source: req.from === "auto" ? null : req.from, target: req.to }),
      timeout_ms: 15000,
    });

    // A non-2xx status is returned, not thrown: map it to a typed error.
    if (r.status === 401 || r.status === 403) throw new ModuleError("missing_credential", "api_key");
    if (r.status === 429) throw new ModuleError("rate_limited", "the Example API asks to slow down");
    if (r.status < 200 || r.status >= 300) throw new ModuleError("http", `the Example API answered ${r.status}`);

    let data;
    try {
      data = JSON.parse(r.body);
    } catch {
      throw new ModuleError("bad_response", "the answer is not JSON");
    }
    if (!data.translation) throw new ModuleError("bad_response", "no translation in the answer");
    await host("log", { level: "debug", message: `translated ${req.text.length} chars` });
    return { text: data.translation, detected_from: data.detected_source ?? null };
  },
};

for (;;) {
  const frame = await nextFrame();
  if (!frame) break;
  if (typeof frame.method !== "string" || frame.id === undefined) continue;
  try {
    const handler = handlers[frame.method];
    if (!handler) throw new ModuleError("unsupported", `${frame.method} is not supported by this module`);
    send({ id: frame.id, result: await handler(frame.params ?? {}) });
  } catch (e) {
    const error = e instanceof ModuleError ? { kind: e.kind, message: e.message } : { kind: "other", message: String(e?.stack ?? e) };
    send({ id: frame.id, error });
  }
}
