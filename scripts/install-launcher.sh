#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_launcher="$repo_dir/scripts/rystal-shell.sh"
target_dir="${XDG_BIN_HOME:-$HOME/.local/bin}"
target_launcher="$target_dir/rystal-shell"

mkdir -p "$target_dir"

if [[ -e "$target_launcher" || -L "$target_launcher" ]]; then
    if [[ -L "$target_launcher" && ! -e "$target_launcher" ]]; then
        rm -- "$target_launcher"
    elif ! grep -Fqx '# Managed by Rystal-shell.' "$target_launcher" 2>/dev/null; then
        printf 'Refusing to replace an unmanaged launcher: %s\n' "$target_launcher" >&2
        exit 1
    fi
fi

install -Dm755 "$source_launcher" "$target_launcher"
printf 'Installed Rystal-shell launcher to %s\n' "$target_launcher"
