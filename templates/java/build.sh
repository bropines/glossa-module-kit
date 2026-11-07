#!/usr/bin/env sh
# Build module.jar: this module's sources and Glossa's Java SDK compiled
# together into one runnable jar (java -jar module.jar). Needs a JDK 17+
# and, unless GLOSSA_JAVA_SDK is set, git.
#
# The SDK's source of truth is sdk/java in https://github.com/bropines/glossa.
# GLOSSA_JAVA_SDK points at a local copy (the folder holding src/); otherwise
# the SDK of GLOSSA_REF (default: main) is fetched once into .glossa-sdk/.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
ref="${GLOSSA_REF:-main}"
sdk="${GLOSSA_JAVA_SDK:-}"
if [ -z "$sdk" ]; then
    cache="$here/.glossa-sdk/$ref"
    if [ ! -d "$cache/sdk/java/src" ]; then
        echo "fetching the Java SDK from bropines/glossa@$ref"
        rm -rf "$cache"
        mkdir -p "$(dirname "$cache")"
        git clone --quiet --depth 1 --branch "$ref" --filter=blob:none --sparse \
            https://github.com/bropines/glossa.git "$cache"
        git -C "$cache" sparse-checkout set sdk/java
    fi
    sdk="$cache/sdk/java"
fi
if [ ! -d "$sdk/src" ]; then
    echo "the Java SDK was not found at $sdk; set GLOSSA_JAVA_SDK" >&2
    exit 1
fi
bin=""
if [ -n "${JAVA_HOME:-}" ]; then bin="$JAVA_HOME/bin/"; fi

rm -rf "$here/build"
mkdir -p "$here/build/classes"
find "$here/src" "$sdk/src" -name '*.java' | sed 's/.*/"&"/' > "$here/build/sources.txt"
"${bin}javac" --release 17 -encoding UTF-8 -d "$here/build/classes" @"$here/build/sources.txt"
"${bin}jar" --create --file "$here/module.jar" --main-class example.ExampleTranslator -C "$here/build/classes" .
echo "built $here/module.jar"
