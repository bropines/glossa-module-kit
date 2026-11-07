# Python template

A translator module in Python. Glossa starts `main.py` as a child process
the first time it is used and stops it when idle. The user needs Python 3.8
or newer. The SDK, `glossa_module.py`, ships with Glossa and is put on the
module's `PYTHONPATH`; to pin a version, copy it next to `main.py` from
[sdk/python](https://github.com/bropines/glossa/blob/main/sdk/python).

Pick this runtime when you need a Python library or already have the code
in Python.

| file | what |
|---|---|
| `module.toml` | the manifest: id, capabilities, permissions, options |
| `main.py` | `translate(req, host)`, calling the service through `host.http` |
| `tests/basic.toml` | cases for `glossa-cli module test`, with recorded HTTP answers |
| `AGENTS.md`, `CLAUDE.md` | instructions for an AI coding assistant |

## Make it yours

1. Change `id`, `name` and `description` in `module.toml`.
2. Replace the URL, the request and the parsing in `main.py` with your
   service's, and list its host under `[permissions] network`.
3. Replace the recorded answers in `tests/` with what the service really
   returns.

Requests made through `host.http` can be recorded and replayed; a library
that opens its own connections cannot, so mark such cases `live = true`.

## Test

```bash
glossa-cli module test --strict .
```

## Read next

- [sdk/python/README.md](https://github.com/bropines/glossa/blob/main/sdk/python/README.md): handlers, the host, errors
- [protocol.md](https://github.com/bropines/glossa/blob/main/docs/modules/protocol.md): requests, results, errors
- [testing.md](https://github.com/bropines/glossa/blob/main/docs/modules/testing.md): the fixture format and the checklist
