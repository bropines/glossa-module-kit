# Native template (C)

A module as a shared library written in plain C, to show that the native
ABI needs no Rust and no SDK: one exported function returning a table of
two, and JSON strings across the boundary. It "translates" by uppercasing,
offline. The same ABI works from C++, Zig, Go (cgo) or anything with a C
FFI.

| file | what |
|---|---|
| `module.toml` | the manifest: `runtime = "native"`, `entry = "shout"` |
| `glossa_module.h` | the ABI, copied from [include/](https://github.com/bropines/glossa/blob/main/include/glossa_module.h) in the Glossa repository |
| `shout.c` | the module, with a tiny JSON scanner and a host `log` call |
| `build.sh` | compile `libshout.so` / `libshout.dylib` / `shout.dll` beside `module.toml` |
| `tests/basic.toml` | cases for `glossa-cli module test` |
| `AGENTS.md`, `CLAUDE.md` | instructions for an AI coding assistant |

`glossa_module.h` describes protocol version 1; take a fresh copy from the
Glossa repository if `api` ever changes. A real module would use a proper
JSON library and call its service through the `http` host call
(`host->call(host->ctx, "http", "{…}")`), which can then be recorded in
`tests/` like the other templates do.

## Build and test

```bash
./build.sh && glossa-cli module test --strict --require-runtimes .
```

The library loads only on the system it was built for; ship one per system.
Glossa loads it into its own process, so a crash in it takes Glossa down.

## Read next

- [native-modules.md](https://github.com/bropines/glossa/blob/main/docs/modules/native-modules.md): the ABI, memory ownership, loading
- [protocol.md](https://github.com/bropines/glossa/blob/main/docs/modules/protocol.md): requests, results, errors
- [testing.md](https://github.com/bropines/glossa/blob/main/docs/modules/testing.md): the fixture format and the checklist
