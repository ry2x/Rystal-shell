#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_dir"

mkdir -p dist
ags bundle src/app.ts dist/start-ags --root "$repo_dir"
sass --load-path styles/default styles/style.scss dist/default.css
