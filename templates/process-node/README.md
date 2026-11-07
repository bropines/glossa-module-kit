# Process template (Node.js)

A translator module as a plain Node.js program, with no SDK. Glossa runs the
`command` from `module.toml` as a child process and speaks the module
protocol over stdin and stdout: one JSON object per line. `main.mjs` does
the whole protocol in about forty lines, which makes it the recipe for any
language (Go, C#, Ruby, a compiled binary). The user needs Node.js 18+.

| file | what |
|---|---|
| `module.toml` | the manifest: `runtime = "process"` and the `command` |
| `main.mjs` | the framing, host calls, and `translate` calling the service through the `http` host call |
| `tests/basic.toml` | cases for `glossa-cli module test`, with recorded HTTP answers |
| `AGENTS.md`, `CLAUDE.md` | instructions for an AI coding assistant |

## Make it yours

1. Change `id`, `name` and `description` in `module.toml`; for another
   language, change `command` (it may differ per system: `command.windows`,
   `command.unix`, …).
2. Replace the URL, the request and the parsing in `main.mjs` with your
   service's, and list its host under `[permissions] network`.
3. Replace the recorded answers in `tests/` with what the service really
   returns.

stdout is the protocol channel: write nothing else to it, and flush after
each frame. Log to stderr (`console.error`) or with the `log` host call.

## Test

```bash
glossa-cli module test --strict .
```

## Read next

- [process-modules.md](https://github.com/bropines/glossa/blob/main/docs/modules/process-modules.md): framing, the command, debugging
- [protocol.md](https://github.com/bropines/glossa/blob/main/docs/modules/protocol.md): requests, results, errors, host calls
- [testing.md](https://github.com/bropines/glossa/blob/main/docs/modules/testing.md): the fixture format and the checklist
