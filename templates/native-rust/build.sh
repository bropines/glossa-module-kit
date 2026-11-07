#!/usr/bin/env sh
# Build the library and copy it beside module.toml, where Glossa (and
# `glossa-cli module test`) looks for it.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
cd "$here"
cargo build --release
target="${CARGO_TARGET_DIR:-$here/target}/release"
case "$(uname -s)" in
    Darwin) lib=libexample_translator.dylib ;;
    MINGW*|MSYS*|CYGWIN*) lib=example_translator.dll ;;
    *) lib=libexample_translator.so ;;
esac
cp "$target/$lib" "$here/$lib"
echo "built $here/$lib"
