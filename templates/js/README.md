# JavaScript template

A translator module in JavaScript. Glossa runs `main.js` in its built-in
engine: the user installs nothing, there is no process and no build step.
Pick this runtime for a web API with JSON in and out.

| file | what |
|---|---|
| `module.toml` | the manifest: id, capabilities, permissions, options |
| `main.js` | `translate(req, host)`, calling the service through `host.fetch` |
| `tests/basic.toml` | cases for `glossa-cli module test`, with recorded HTTP answers |
| `jsconfig.json` | points editors at `types/glossa.d.ts` for completion and checks |
| `AGENTS.md`, `CLAUDE.md` | instructions for an AI coding assistant |

## Make it yours

1. Change `id`, `name` and `description` in `module.toml`.
2. Replace the URL, the request and the parsing in `main.js` with your
   service's, and list its host under `[permissions] network`.
3. Replace the recorded answers in `tests/` with what the service really
   returns (from its documentation, or `--record` with your own key passed
   through `--set-from-env`).
4. If you moved the folder, fix the `glossa.d.ts` path in `jsconfig.json`
   (or copy `types/glossa.d.ts` next to `main.js`).

## Test

```bash
glossa-cli module test --strict .
```

## Read next

- [js-modules.md](https://github.com/bropines/glossa/blob/main/docs/modules/js-modules.md): the host API and the environment
- [protocol.md](https://github.com/bropines/glossa/blob/main/docs/modules/protocol.md): requests, results, errors
- [testing.md](https://github.com/bropines/glossa/blob/main/docs/modules/testing.md): the fixture format and the checklist
