#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
dev_dir="$repo_dir/.dev"

echo "Loading development environment for rystal-shell in $repo_dir"

if [[
    "${RYSTAL_SHELL_CONFIG_DIR:-}" != "$dev_dir/config" ||
    "${RYSTAL_SHELL_DATA_DIR:-}" != "$repo_dir" ||
    "${RYSTAL_SHELL_INSTANCE:-}" != "rystal-shell-dev" ||
    "${RYSTAL_SHELL_CACHE_DIR:-}" != "$dev_dir/cache" ||
    "${RYSTAL_SHELL_STATE_DIR:-}" != "$dev_dir/state" ||
    "${RYSTAL_SHELL_RUNTIME_DIR:-}" != "$dev_dir/runtime"
]]; then
    printf '%s\n' "error: development environment is not loaded. Run 'direnv allow' in $repo_dir." >&2
    exit 1
fi

mkdir -p \
    "$RYSTAL_SHELL_CONFIG_DIR" \
    "$RYSTAL_SHELL_CACHE_DIR" \
    "$RYSTAL_SHELL_STATE_DIR" \
    "$RYSTAL_SHELL_RUNTIME_DIR"

if [[ ! -e "$RYSTAL_SHELL_CONFIG_DIR/config.json" ]]; then
    cp "$repo_dir/config/config.json.template" "$RYSTAL_SHELL_CONFIG_DIR/config.json"
fi

exec ags run "$repo_dir/src/app.tsx" "$@"
