# Native template (Rust)

A translator module as a shared library written in Rust with
[`glossa-module-sdk`](https://github.com/bropines/glossa/blob/main/crates/glossa-module-sdk). Glossa loads it into
its own process: nothing for the user to install and no start-up cost, but
a crash takes Glossa down, so this runtime is for code you trust and for
speed (offline engines, local models).

| file | what |
|---|---|
| `module.toml` | the manifest: `runtime = "native"`, `entry` names the library |
| `Cargo.toml` | a `cdylib` depending on `glossa-module-sdk` from the Glossa repository |
| `src/lib.rs` | `impl Module`, calling the service through `host.http`, and `export_module!` |
| `build.sh`, `build.ps1` | `cargo build --release` and copy the library beside `module.toml` |
| `tests/basic.toml` | cases for `glossa-cli module test`, with recorded HTTP answers |
| `AGENTS.md`, `CLAUDE.md` | instructions for an AI coding assistant |

## Build

```bash
./build.sh          # or .\build.ps1 on Windows
```

The SDK is a git dependency on Glossa's `main`; pin a tag or a commit in
`Cargo.toml` once one has what you need. A library built for one system
loads only there: ship one per system (`.dll`, `.so`, `.dylib`) beside
`module.toml`.

## Make it yours

1. Change `id`, `name` and `description` in `module.toml`. If you rename
   the cargo package, change `entry` and the library names in the build
   scripts too.
2. Replace the URL, the request and the parsing in `src/lib.rs`, and list
   the service's host under `[permissions] network`.
3. Replace the recorded answers in `tests/` with what the service really
   returns.

## Test

```bash
cargo test && ./build.sh && glossa-cli module test --strict --require-runtimes .
```

## Read next

- [native-modules.md](https://github.com/bropines/glossa/blob/main/docs/modules/native-modules.md): the ABI, loading, safety
- [protocol.md](https://github.com/bropines/glossa/blob/main/docs/modules/protocol.md): requests, results, errors
- [testing.md](https://github.com/bropines/glossa/blob/main/docs/modules/testing.md): the fixture format and the checklist
