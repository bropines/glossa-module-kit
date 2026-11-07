# Contributing

Fixes and improvements to the templates, the editor types and the action
are welcome. Questions about Glossa itself, its module protocol or its SDKs
belong in [bropines/glossa](https://github.com/bropines/glossa/issues).

## What lives where

- **The source of truth is Glossa.** The module protocol, the SDKs
  (`sdk/python`, `sdk/java`, `crates/glossa-module-sdk`,
  `include/glossa_module.h`) and the test harness are maintained in the
  Glossa repository. Change them there, not here. This kit fetches the
  SDKs at build time (Java, Rust) or copies them (the C header); refresh a
  copy when Glossa changes it.
- **`types/glossa.d.ts`** follows Glossa's JavaScript runtime
  (`crates/glossa-modules/src/runtime/js`) and
  [js-modules.md](https://github.com/bropines/glossa/blob/main/docs/modules/js-modules.md).
  When the API there changes, change the types in the same spirit: what the
  runtime provides, nothing more.
- **`AGENTS.md`** in each template is based on Glossa's
  [agents-template.md](https://github.com/bropines/glossa/blob/main/docs/modules/agents-template.md),
  with the module's details filled in and other runtimes left out.

## Rules

- **Every template passes its own tests.** Before a pull request, build the
  templates that need it and run, from the repository root:

  ```bash
  templates/java/build.sh && templates/native-rust/build.sh && templates/native-c/build.sh
  glossa-cli module test --strict --require-runtimes templates/
  ```

  CI runs the same through `action.yml` on Linux and macOS.
- **Templates stay small and alike.** Each is a translator with the same
  cases (a translation, a detected language, a missing key, a rejected key,
  a rate limit), so a reader can compare runtimes side by side. Add a new
  runtime as a new folder with the same shape, a README, an `AGENTS.md`
  and a `CLAUDE.md` (`@AGENTS.md`), and a step in
  `.github/workflows/templates.yml`.
- **No secrets.** Never commit an API key, token or password. Fixtures use
  obvious fakes (`test-key`); recordings are read before they are
  committed.
- **No weakened checks.** Do not delete a failing case, loosen an
  expectation until it means nothing, or widen `[permissions] network`
  to `"*"` to make a test pass.
- **Shell scripts pass `shellcheck`** and run on the bash 3.2 that macOS
  ships.

## Licence

Contributions are dual-licensed under MIT OR Apache-2.0, as the README
says.
