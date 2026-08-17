#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dev_dir="$repo_dir/.dev"

export RYSTAL_SHELL_CONFIG_DIR="${RYSTAL_SHELL_CONFIG_DIR:-$dev_dir/config}"
export RYSTAL_SHELL_DATA_DIR="${RYSTAL_SHELL_DATA_DIR:-$repo_dir}"
export RYSTAL_SHELL_INSTANCE="${RYSTAL_SHELL_INSTANCE:-rystal-shell-dev}"
export RYSTAL_SHELL_CACHE_DIR="${RYSTAL_SHELL_CACHE_DIR:-$dev_dir/cache}"
export RYSTAL_SHELL_STATE_DIR="${RYSTAL_SHELL_STATE_DIR:-$dev_dir/state}"
export RYSTAL_SHELL_RUNTIME_DIR="${RYSTAL_SHELL_RUNTIME_DIR:-$dev_dir/runtime}"

mkdir -p \
    "$RYSTAL_SHELL_CONFIG_DIR" \
    "$RYSTAL_SHELL_CACHE_DIR" \
    "$RYSTAL_SHELL_STATE_DIR" \
    "$RYSTAL_SHELL_RUNTIME_DIR"

if [[ ! -e "$RYSTAL_SHELL_CONFIG_DIR/config.json" ]]; then
    cp "$repo_dir/config/config.json.template" "$RYSTAL_SHELL_CONFIG_DIR/config.json"
fi

exec ags run "$repo_dir/src/app.ts" "$@"
