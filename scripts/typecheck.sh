#!/usr/bin/env bash

set -euo pipefail

output_file="$(mktemp)"
trap 'rm -f "$output_file"' EXIT

if pnpm exec tsc --pretty false >"$output_file" 2>&1; then
    cat "$output_file"
    exit 0
fi

error_lines="$(grep 'error TS' "$output_file" || true)"
unexpected_errors="$(printf '%s\n' "$error_lines" | grep -vF 'usr/share/ags/js/' || true)"

if [[ -n "$unexpected_errors" ]]; then
    cat "$output_file"
    exit 1
fi

printf 'TypeScript passed; ignoring errors from the system AGS sources:\n'
printf '%s\n' "$error_lines"
