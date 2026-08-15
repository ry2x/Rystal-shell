#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_dir"

mkdir -p dist
node scripts/build-js.mjs
install -Dm755 scripts/start-ags.sh dist/start-ags
sass --style=compressed --load-path styles/default styles/style.scss dist/default.css
