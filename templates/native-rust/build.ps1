# Build the library and copy it beside module.toml, where Glossa (and
# `glossa-cli module test`) looks for it.
$ErrorActionPreference = "Stop"
Push-Location $PSScriptRoot
try {
    cargo build --release
    if ($LASTEXITCODE -ne 0) { throw "cargo build failed" }
    $target = if ($env:CARGO_TARGET_DIR) { Join-Path $env:CARGO_TARGET_DIR "release" } else { Join-Path $PSScriptRoot "target\release" }
    Copy-Item (Join-Path $target "example_translator.dll") $PSScriptRoot
    Write-Host "built $(Join-Path $PSScriptRoot 'example_translator.dll')"
} finally { Pop-Location }
