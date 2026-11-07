# Build module.jar: this module's sources and Glossa's Java SDK compiled
# together into one runnable jar (java -jar module.jar). Needs a JDK 17+
# and, unless $env:GLOSSA_JAVA_SDK is set, git.
#
# The SDK's source of truth is sdk/java in https://github.com/bropines/glossa.
# $env:GLOSSA_JAVA_SDK points at a local copy (the folder holding src\);
# otherwise the SDK of $env:GLOSSA_REF (default: main) is fetched once into
# .glossa-sdk\.
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$ref = if ($env:GLOSSA_REF) { $env:GLOSSA_REF } else { "main" }
$sdk = $env:GLOSSA_JAVA_SDK
if (-not $sdk) {
    $cache = Join-Path $here ".glossa-sdk\$ref"
    if (-not (Test-Path (Join-Path $cache "sdk\java\src"))) {
        Write-Host "fetching the Java SDK from bropines/glossa@$ref"
        Remove-Item -Recurse -Force $cache -ErrorAction SilentlyContinue
        git clone --quiet --depth 1 --branch $ref --filter=blob:none --sparse https://github.com/bropines/glossa.git $cache
        if ($LASTEXITCODE -ne 0) { throw "git clone failed" }
        git -C $cache sparse-checkout set sdk/java
        if ($LASTEXITCODE -ne 0) { throw "git sparse-checkout failed" }
    }
    $sdk = Join-Path $cache "sdk\java"
}
if (-not (Test-Path (Join-Path $sdk "src"))) { throw "the Java SDK was not found at $sdk; set GLOSSA_JAVA_SDK" }
$bin = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME "bin" } else { "" }
function Tool($name) { if ($bin) { Join-Path $bin "$name.exe" } else { $name } }

$build = Join-Path $here "build"
Remove-Item -Recurse -Force $build -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force (Join-Path $build "classes") | Out-Null
Get-ChildItem -Recurse -Filter *.java (Join-Path $here "src"), (Join-Path $sdk "src") |
    ForEach-Object { '"' + ($_.FullName -replace '\\', '/') + '"' } |
    Set-Content -Encoding ascii (Join-Path $build "sources.txt")
& (Tool javac) --release 17 -encoding UTF-8 -d (Join-Path $build "classes") "@$(Join-Path $build 'sources.txt')"
if ($LASTEXITCODE -ne 0) { throw "javac failed" }
& (Tool jar) --create --file (Join-Path $here "module.jar") --main-class example.ExampleTranslator -C (Join-Path $build "classes") .
if ($LASTEXITCODE -ne 0) { throw "jar failed" }
Write-Host "built $(Join-Path $here 'module.jar')"
