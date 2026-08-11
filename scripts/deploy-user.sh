#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
data_home="${XDG_DATA_HOME:-$HOME/.local/share}"
target="$data_home/rystal-shell"
backup="$data_home/rystal-shell.previous"

case "$target" in
    */rystal-shell) ;;
    *)
        printf 'Refusing unexpected deployment target: %s\n' "$target" >&2
        exit 1
        ;;
esac

cd "$repo_dir"
"$repo_dir/scripts/build.sh"

mkdir -p "$data_home"
stage="$(mktemp -d "$data_home/.rystal-shell.stage.XXXXXX")"
trap 'rm -rf -- "$stage"' EXIT

install -Dm755 dist/start-ags "$stage/start-ags"
install -Dm644 dist/default.css "$stage/styles/default.css"
cp -a assets "$stage/assets"
cp -a styles/. "$stage/styles/"
rm -f -- "$stage"/assets/launcher_bg*.png
rm -f -- "$stage/assets/icons/hicolor/icon-theme.cache"

rm -rf -- "$backup"
if [[ -e "$target" || -L "$target" ]]; then
    mv -- "$target" "$backup"
fi

if ! mv -- "$stage" "$target"; then
    if [[ -e "$backup" || -L "$backup" ]]; then
        mv -- "$backup" "$target"
    fi
    exit 1
fi

trap - EXIT
printf 'Deployed Rystal-shell to %s\n' "$target"
