#!/usr/bin/env bash

set -euo pipefail

output_file="$(mktemp)"
trap 'rm -f "$output_file"' EXIT

if pnpm exec tsc --pretty false >"$output_file" 2>&1; then
    cat "$output_file"
    exit 0
fi

known_error_paths=(
    '../../../usr/share/ags/js/lib/gtk4/app.ts(288,17)'
    '../../../usr/share/ags/js/node_modules/gnim/dist/jsx/state.ts(715,47)'
)

error_lines="$(grep 'error TS' "$output_file" || true)"
unexpected_errors="$error_lines"
for path in "${known_error_paths[@]}"; do
    unexpected_errors="$(printf '%s\n' "$unexpected_errors" | grep -vF "$path" || true)"
done

if [[ -n "$unexpected_errors" ]]; then
    cat "$output_file"
    exit 1
fi

printf 'TypeScript passed; ignoring known upstream errors:\n'
printf '%s\n' "$error_lines"
