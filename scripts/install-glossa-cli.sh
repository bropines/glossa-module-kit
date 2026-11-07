#!/usr/bin/env bash
# The steps of action.yml. One script with a subcommand per step, so the
# logic can be read (and run by hand) in one place:
#
#   resolve  pick and download a release; decide whether to build instead
#   build    cargo install glossa-cli from a commit of bropines/glossa
#   finish   put glossa-cli on PATH, and check it has `module test`
#   test     module check and module test on the module folder
#
# Steps talk through $GITHUB_OUTPUT and $GITHUB_ENV, as Actions does.
set -euo pipefail

REPO=bropines/glossa
STATE="${RUNNER_TOOL_CACHE:-${RUNNER_TEMP:-/tmp}}/glossa-module-kit"

out() { echo "$1=$2" >> "$GITHUB_OUTPUT"; }
fail() { echo "::error title=glossa-cli::$*"; exit 1; }
exe() { case "${RUNNER_OS:-$(uname -s)}" in Windows*|MINGW*|MSYS*) echo glossa-cli.exe ;; *) echo glossa-cli ;; esac; }

# Whether a glossa-cli has the test harness (Glossa PR #31): its help lists
# `module test`. Older builds answer "unknown command" to it.
has_harness() {
    local help
    help=$("$1" --help 2>&1 || true)
    case "$help" in *"module test"*) return 0 ;; *) return 1 ;; esac
}

sha256() { if command -v sha256sum >/dev/null; then sha256sum "$1"; else shasum -a 256 "$1"; fi | cut -d' ' -f1; }

resolve() {
    # Installed by an earlier use of this action in the same job: reuse it.
    local key="version=${INPUT_VERSION};ref=${INPUT_REF}"
    out key "$key"
    if [ "${GLOSSA_MODULE_KIT_KEY:-}" = "$key" ] && [ -x "${GLOSSA_MODULE_KIT_CLI:-}" ]; then
        echo "glossa-cli is already installed: $GLOSSA_MODULE_KIT_CLI"
        out cli "$GLOSSA_MODULE_KIT_CLI"
        out build false
        return
    fi

    local cli="" why=""
    if [ "$INPUT_VERSION" = "none" ]; then
        why="glossa-version is none"
    elif cli=$(download_release); then
        if has_harness "$cli"; then
            out cli "$cli"
            out build false
            return
        fi
        why="glossa-cli from the release has no \`module test\` (it arrived after this release)"
        cli=""
    else
        why="the release could not be used"
    fi

    if [ -z "$INPUT_REF" ]; then
        fail "$why. Set glossa-version to a release that has the module test harness, or glossa-ref (for example main) to build glossa-cli from source."
    fi
    echo "::notice title=glossa-cli::$why; building glossa-cli from $REPO@$INPUT_REF instead"
    local sha
    sha=$(git ls-remote "https://github.com/$REPO.git" "$INPUT_REF" "refs/heads/$INPUT_REF" "refs/tags/$INPUT_REF" | head -n1 | cut -f1)
    if [ -z "$sha" ]; then
        # Not a branch or tag: take it as a commit.
        [[ "$INPUT_REF" =~ ^[0-9a-f]{7,40}$ ]] || fail "glossa-ref $INPUT_REF is not a branch, tag or commit of $REPO"
        sha="$INPUT_REF"
    fi
    echo "building from commit $sha"
    out sha "$sha"
    out build true
    out build-root "$STATE/build-$sha"
}

# Download and unpack glossa-cli from a release; print its path.
download_release() {
    local tag
    if [ "$INPUT_VERSION" = "latest" ]; then
        tag=$(gh api "repos/$REPO/releases?per_page=20" --jq '[.[] | select(.draft | not)][0].tag_name') || return 1
        [ -n "$tag" ] && [ "$tag" != "null" ] || { echo "::warning::$REPO has no published release" >&2; return 1; }
    else
        tag="v${INPUT_VERSION#v}"
    fi
    local version="${tag#v}" arch os asset
    case "${RUNNER_ARCH:-X64}" in
        X64) arch=x86_64 ;;
        ARM64) arch=arm64 ;;
        *) echo "::warning::no glossa-cli release for the $RUNNER_ARCH processor" >&2; return 1 ;;
    esac
    case "${RUNNER_OS:-Linux}" in
        Linux) asset="glossa-$version-$arch-linux-portable.tar.gz" ;;
        macOS) asset="glossa-$version-$arch-macos.zip" ;;
        Windows) asset="glossa-$version-$arch-windows-portable.zip" ;;
        *) echo "::warning::no glossa-cli release for $RUNNER_OS" >&2; return 1 ;;
    esac
    local dir="$STATE/release-$version-$arch"
    rm -rf "$dir" && mkdir -p "$dir"
    echo "downloading $asset from $REPO $tag" >&2
    gh release download "$tag" -R "$REPO" -p "$asset" -p SHA256SUMS -D "$dir" >&2 \
        || { echo "::warning::could not download $asset from $REPO $tag" >&2; return 1; }
    local want
    want=$(grep " \*\?$asset\$" "$dir/SHA256SUMS" | cut -d' ' -f1 || true)
    if [ -n "$want" ] && [ "$want" != "$(sha256 "$dir/$asset")" ]; then
        echo "::error::$asset does not match SHA256SUMS" >&2
        return 1
    fi
    case "$asset" in
        *.tar.gz) tar -xzf "$dir/$asset" -C "$dir" ;;
        *.zip) if command -v unzip >/dev/null; then unzip -q "$dir/$asset" -d "$dir"; else 7z x -y -o"$dir" "$dir/$asset" >/dev/null; fi ;;
    esac
    local cli
    cli=$(find "$dir" -name "$(exe)" -type f -not -path '*/Contents/MacOS/*' | head -n1)
    [ -n "$cli" ] || cli=$(find "$dir" -name "$(exe)" -type f | head -n1)
    [ -n "$cli" ] || { echo "::warning::$asset holds no $(exe)" >&2; return 1; }
    chmod +x "$cli"
    echo "$cli"
}

build() {
    if [ "${RUNNER_OS:-}" = Linux ]; then
        # The audio backend of the system voice links ALSA.
        if ! pkg-config --exists alsa 2>/dev/null; then
            sudo apt-get update -qq
            sudo apt-get install -y -qq --no-install-recommends libasound2-dev pkg-config
        fi
    fi
    rustup toolchain install stable --profile minimal --no-self-update
    cargo +stable install --locked --git "https://github.com/$REPO.git" --rev "$BUILD_SHA" \
        --root "$BUILD_ROOT" glossa-cli
    # Python modules import glossa_module.py; a release ships it beside the
    # executable, so put the one from the same commit there too.
    mkdir -p "$BUILD_ROOT/bin/sdk/python"
    curl -fsSL "https://raw.githubusercontent.com/$REPO/$BUILD_SHA/sdk/python/glossa_module.py" \
        -o "$BUILD_ROOT/bin/sdk/python/glossa_module.py"
}

finish() {
    local cli="$CANDIDATE"
    if [ "$BUILD" = true ]; then
        cli="$BUILD_ROOT/bin/$(exe)"
    fi
    [ -x "$cli" ] || fail "glossa-cli was not installed ($cli is missing)"
    has_harness "$cli" || fail "$cli has no \`module test\` command. It needs a Glossa with the module test harness (bropines/glossa#31): pick a newer glossa-version, or set glossa-ref."

    local dir
    dir=$(cd "$(dirname "$cli")" && pwd)
    echo "$dir" >> "$GITHUB_PATH"
    # Point Python modules at the SDK that came with this glossa-cli, wherever
    # the archive keeps it (the macOS zip has it inside Glossa.app).
    local sdk
    sdk=$(find "$dir" "$(dirname "$dir")" -maxdepth 6 -name glossa_module.py -type f 2>/dev/null | head -n1 || true)
    if [ -n "$sdk" ]; then
        echo "GLOSSA_PYTHON_SDK=$(dirname "$sdk")" >> "$GITHUB_ENV"
    fi
    {
        echo "GLOSSA_MODULE_KIT_CLI=$cli"
        echo "GLOSSA_MODULE_KIT_KEY=$INSTALL_KEY"
    } >> "$GITHUB_ENV"
    local version
    version=$("$cli" --version)
    echo "using $version ($cli)"
    out cli "$cli"
    out version "$version"
}

test_module() {
    [ -e "$MODULE_PATH" ] || fail "the module path $MODULE_PATH does not exist"
    local flags=()
    [ "$STRICT" = true ] && flags+=(--strict)
    local test_flags=(${flags[@]+"${flags[@]}"})
    [ "$REQUIRE_RUNTIMES" = true ] && test_flags+=(--require-runtimes)
    # shellcheck disable=SC2206 # extra arguments are split on purpose
    [ -n "$EXTRA_ARGS" ] && test_flags+=($EXTRA_ARGS)
    echo "::group::glossa-cli module check $MODULE_PATH"
    # ${a[@]+"${a[@]}"}: an empty array under set -u in macOS's bash 3.2.
    "$GLOSSA_CLI" module check ${flags[@]+"${flags[@]}"} "$MODULE_PATH"
    echo "::endgroup::"
    "$GLOSSA_CLI" module test ${test_flags[@]+"${test_flags[@]}"} "$MODULE_PATH"
}

case "${1:-}" in
    resolve) resolve ;;
    build) build ;;
    finish) finish ;;
    test) test_module ;;
    *) echo "usage: $0 resolve|build|finish|test" >&2; exit 2 ;;
esac
