"""A Glossa translator module in Python.

Glossa calls translate(req, host) with
    req = {"text", "from", "to", "style"?, "glossary"?, "options"}
and expects {"text", "detected_from"?} back (docs/modules/protocol.md).
The SDK reference is sdk/python/README.md in the Glossa repository.
"""

import json

from glossa_module import Module, ModuleError

mod = Module()

API_URL = "https://api.example.com/v1/translate"


@mod.translate
def translate(req, host):
    key = host.option("api_key")
    # An empty required setting: Glossa tells the user to fill in api_key.
    if not key:
        raise ModuleError("missing_credential", "api_key")

    # host.http goes through Glossa: the user's proxy, the module's network
    # permissions, and a recording in tests. A timeout below Glossa's 30 s
    # budget makes a slow service fail with a clear error.
    r = host.http(
        "POST",
        API_URL,
        headers={"Authorization": "Bearer " + key},
        json_body={
            "text": req["text"],
            "source": None if req["from"] == "auto" else req["from"],
            "target": req["to"],
        },
        timeout=15,
    )

    # A non-2xx status is returned, not raised: map it to a typed error.
    status = r["status"]
    if status in (401, 403):
        raise ModuleError("missing_credential", "api_key")
    if status == 429:
        raise ModuleError("rate_limited", "the Example API asks to slow down")
    if not 200 <= status < 300:
        raise ModuleError("http", "the Example API answered %d" % status)

    try:
        data = json.loads(r["body"])
    except ValueError:
        raise ModuleError("bad_response", "the answer is not JSON")
    if not data.get("translation"):
        raise ModuleError("bad_response", "no translation in the answer")
    return {"text": data["translation"], "detected_from": data.get("detected_source")}


mod.run()
