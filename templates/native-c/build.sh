#!/usr/bin/env sh
# Compile shout.c into the library Glossa loads, beside module.toml.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
cd "$here"
cc="${CC:-cc}"
case "$(uname -s)" in
    Darwin) "$cc" -shared -std=c99 -O2 -Wall -Wextra -I . -o libshout.dylib shout.c; lib=libshout.dylib ;;
    MINGW*|MSYS*|CYGWIN*) "$cc" -shared -std=c99 -O2 -Wall -Wextra -I . -o shout.dll shout.c; lib=shout.dll ;;
    *) "$cc" -shared -fPIC -std=c99 -O2 -Wall -Wextra -I . -o libshout.so shout.c; lib=libshout.so ;;
esac
echo "built $here/$lib"
