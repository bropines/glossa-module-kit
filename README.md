# Glossa module kit

Templates, editor types and a GitHub Action for writing and testing
[Glossa](https://github.com/bropines/glossa) modules, without cloning
Glossa itself.

Glossa is a desktop translator. Everything it translates, looks up, reads
aloud or recognises with comes from a service, and a **module** is a service
you add: a folder with a `module.toml` and some code. A module can be a
translator, a language detector, a dictionary, a voice or a text recogniser
(OCR), and can be written in JavaScript, Python, Java, any program that
reads and writes JSON lines, or a native library.

## What is here

| path | what |
|---|---|
| [`templates/js`](templates/js) | JavaScript: runs inside Glossa, nothing to install |
| [`templates/python`](templates/python) | Python, with Glossa's Python SDK |
| [`templates/java`](templates/java) | Java (or Kotlin), with Glossa's Java SDK |
| [`templates/process-node`](templates/process-node) | any program over stdin/stdout, here Node.js with no SDK |
| [`templates/native-rust`](templates/native-rust) | a native library in Rust, with `glossa-module-sdk` |
| [`templates/native-c`](templates/native-c) | a native library in plain C, with `glossa_module.h` |
| [`types/glossa.d.ts`](types/glossa.d.ts) | editor types for the JavaScript module API |
| [`action.yml`](action.yml) | a GitHub Action that runs Glossa's module test harness |

Each template is a small working translator with tests that run offline,
a README, and an `AGENTS.md` for AI coding assistants. Every template but
the C one calls an imaginary JSON API at `api.example.com`: replace it with
your service.

## Choosing a runtime

| your service or code | runtime |
|---|---|
| a web API with JSON in and out | **JavaScript**: no process, no toolchain, nothing for the user to install |
| needs a Python library, or exists in Python | **Python**: a process started on first use, stopped when idle |
| Java, Kotlin or a JVM library | **Java**: the same process model; the user needs Java 17+ |
| Go, C#, Ruby, Node, a compiled binary | **process**: JSON lines over stdio, no SDK needed |
| a fast local engine in Rust, C, C++, Zig | **native**: loaded into Glossa; a crash takes Glossa down |

The details are in [Which runtime?](https://github.com/bropines/glossa/blob/main/docs/modules/README.md#which-runtime)
in Glossa's module documentation.

## Quick start

1. **Get the template.** Press *Use this template* on GitHub to make your
   own repository from this one, or copy a single folder:

   ```bash
   git clone https://github.com/bropines/glossa-module-kit
   cp -r glossa-module-kit/templates/js my-module
   ```

   In a repository made from the template, keep the folder for your
   runtime (moving its contents to the top level if you like) and delete
   the others. A JavaScript module that moves also needs the path to
   `glossa.d.ts` in `jsconfig.json` fixed.

2. **Make it yours.** Change `id`, `name` and `description` in
   `module.toml`, then the code and the recorded answers in `tests/`. The
   template's README says where.

3. **Get `glossa-cli`.** It comes with Glossa: in the portable archives
   beside `glossa`, and in the macOS zip beside `Glossa.app`
   ([releases](https://github.com/bropines/glossa/releases)). The test
   harness, `glossa-cli module test`, is newer than the latest release;
   until a release has it, build `glossa-cli` from source (Rust 1.95+):

   ```bash
   cargo install --locked --git https://github.com/bropines/glossa glossa-cli
   ```

4. **Test it.** Build first if the template has a `build.sh` (Java,
   native), then:

   ```bash
   cd my-module
   glossa-cli module check .            # the manifest and files only
   glossa-cli module test --strict .    # load it, run tests/*.toml offline, check every answer
   ```

   The harness loads the module the way Glossa does and replays recorded
   HTTP answers instead of calling the service, so the tests run offline and
   in CI. The fixture format and a checklist for a new module are in
   [testing.md](https://github.com/bropines/glossa/blob/main/docs/modules/testing.md).

5. **Install it into Glossa.** *Options → Modules → Install module…* and
   pick the folder, or copy it into the `modules` folder of Glossa's data
   folder (`%APPDATA%\Glossa\modules`, `~/.config/glossa/modules`,
   `~/Library/Application Support/Glossa/modules`). *Reload modules* on
   the same page picks up changes. To try it without touching your
   settings:

   ```bash
   mkdir -p /tmp/gtest/modules && cp -r my-module /tmp/gtest/modules/
   glossa-cli --home /tmp/gtest modules                   # loaded, or why not
   glossa-cli --home /tmp/gtest -v translate -s <your id> -t de "Hello"
   ```

   A module with a required setting (an API key) is listed but switched off
   until you fill it in under *Options → Services*.

## Testing in GitHub Actions

Add a workflow to your module's repository:

```yaml
# .github/workflows/test.yml
name: test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Java and native modules: build here first (./build.sh).
      - uses: bropines/glossa-module-kit@main
        with:
          path: .                  # the module folder
          glossa-ref: main         # build glossa-cli from source until a release has `module test`
```

| input | default | meaning |
|---|---|---|
| `path` | `.` | the module folder, or a folder with several modules below it |
| `glossa-version` | `latest` | the Glossa release to take `glossa-cli` from (`0.2.0`, `v0.2.0`, or `latest`, pre-releases included) |
| `glossa-ref` | empty | a branch, tag or commit of bropines/glossa to build `glossa-cli` from with `cargo install` when the release has no `module test`; cached by commit |
| `strict` | `true` | warnings fail the module too |
| `require-runtimes` | `true` | a module that cannot run (no Python, a jar or library not built) fails instead of being skipped |
| `args` | empty | more arguments for `module test` (`--timeout 60`) |

The action runs on Linux, macOS and Windows runners. Without `glossa-ref`,
it stops with a clear error when the release's `glossa-cli` has no
`module test`. Python, Node and Java must be on the runner for modules
that need them (`actions/setup-python`, `setup-node`, `setup-java`).

## Sharing a module

- **Publish the repository** and give it the GitHub topic
  `glossa-module`, so others can find it. Say in its README what the
  module does, which service it talks to, and whether it needs a key.
- **Attach a zip of the module folder to a release** for people who do not
  use git. For Java, include the built `module.jar`; for native modules,
  the library for each system you support (`.dll`, `.so`, `.dylib`).
  Users unpack it and use *Install module…*.
- **Keep secrets out.** Never commit an API key, token or password, not in
  the code, the fixtures or the recordings. Declare a `secret` option and
  let the user fill it in; tests use obvious fakes such as `test-key`.
  The harness fails a module whose files look like they hold a key.
- **Keep it tested.** The workflow above runs the module's tests on every
  push; `--strict` keeps warnings from piling up.
- **Respect the service.** Use its official API where there is one, follow
  its terms, and set `max_input_chars` to what it accepts.

## Documentation

Glossa's module documentation lives in its repository:

- [Modules overview](https://github.com/bropines/glossa/blob/main/docs/modules/README.md): `module.toml`, options, permissions, assets
- [The protocol](https://github.com/bropines/glossa/blob/main/docs/modules/protocol.md): requests, results, errors, host calls
- [Testing](https://github.com/bropines/glossa/blob/main/docs/modules/testing.md): the harness, fixtures, recordings, a checklist
- Per runtime: [JavaScript](https://github.com/bropines/glossa/blob/main/docs/modules/js-modules.md),
  [Python](https://github.com/bropines/glossa/blob/main/sdk/python/README.md), [Java and process](https://github.com/bropines/glossa/blob/main/docs/modules/process-modules.md),
  [native](https://github.com/bropines/glossa/blob/main/docs/modules/native-modules.md), [OCR modules](https://github.com/bropines/glossa/blob/main/docs/modules/ocr-modules.md)
- [An AGENTS.md for your module](https://github.com/bropines/glossa/blob/main/docs/modules/agents-template.md)

The SDKs (`sdk/python`, `sdk/java`, `glossa-module-sdk`,
`glossa_module.h`) are maintained in the Glossa repository; this kit
fetches or copies them from there.

## Licence

Dual-licensed under either of

- the MIT licence ([LICENSE](LICENSE)), or
- the Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE)),

at your option, like Glossa itself. Modules you make from the templates are
yours to license as you wish.

Unless you explicitly state otherwise, any contribution intentionally
submitted for inclusion in this repository, as defined in the Apache-2.0
licence, is dual-licensed as above, without any additional terms or
conditions.
