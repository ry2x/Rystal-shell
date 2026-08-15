#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

exec env LD_PRELOAD="/usr/lib/libgtk4-layer-shell.so" \
  /usr/bin/gjs -m "$script_dir/app.js" "$@"
