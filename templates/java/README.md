# Java template

A translator module in Java (Kotlin or any JVM language works the same
way). Glossa runs `java -jar module.jar` as a child process on first use
and stops it when idle. The user needs a Java 17+ runtime.

| file | what |
|---|---|
| `module.toml` | the manifest: id, capabilities, permissions, options |
| `src/example/ExampleTranslator.java` | `translate(req, host)`, calling the service through `host.http` |
| `build.sh`, `build.ps1` | compile the module and the SDK into `module.jar` |
| `tests/basic.toml` | cases for `glossa-cli module test`, with recorded HTTP answers |
| `AGENTS.md`, `CLAUDE.md` | instructions for an AI coding assistant |

## Build

```bash
./build.sh          # or .\build.ps1 in PowerShell; needs a JDK 17+ and git
```

The Java SDK lives in the Glossa repository ([sdk/java](https://github.com/bropines/glossa/blob/main/sdk/java)). The
build script fetches it once into `.glossa-sdk/` (`GLOSSA_REF` picks the
branch or tag, `main` by default), or uses a local copy named by
`GLOSSA_JAVA_SDK`. It is compiled into the jar, so the module carries the
SDK version it was built with.

## Make it yours

1. Change `id`, `name` and `description` in `module.toml`; rename the
   class and `--main-class` in the build scripts if you like.
2. Replace the URL, the request and the parsing with your service's, and
   list its host under `[permissions] network`.
3. Replace the recorded answers in `tests/` with what the service really
   returns.

## Test

```bash
./build.sh && glossa-cli module test --strict --require-runtimes .
```

Ship `module.toml` and `module.jar`; `src/` and the build scripts are
for you.

## Read next

- [sdk/java/README.md](https://github.com/bropines/glossa/blob/main/sdk/java/README.md): the SDK
- [process-modules.md](https://github.com/bropines/glossa/blob/main/docs/modules/process-modules.md#java-modules): how Glossa runs Java
- [testing.md](https://github.com/bropines/glossa/blob/main/docs/modules/testing.md): the fixture format and the checklist
