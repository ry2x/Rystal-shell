#!/usr/bin/env bash
# ┳┳┓┏┓┏┳┓┳┳┏┓┏┓┳┓  ┳┳┓┏┓┏┓┳┏┓┓┏┓
# ┃┃┃┣┫ ┃ ┃┃┃┓┣ ┃┃  ┃┃┃┣┫┃┓┃┃ ┃┫
# ┛ ┗┛┗ ┻ ┗┛┗┛┗┛┛┗  ┛ ┗┛┗┗┛┻┗┛┛┗┛

# SPDX-FileCopyrightText: 2026 Ry2X
# SPDX-License-Identifier: GPL-3.0-or-later

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_script="$script_dir/theme-switch.sh"
target_dir="${XDG_BIN_HOME:-$HOME/.local/bin}"
target_link="$target_dir/theme-switch.sh"

if [[ ! -f "$source_script" ]]; then
    printf 'Error: source script not found: %s\n' "$source_script" >&2
    exit 1
fi

chmod +x "$source_script"
mkdir -p "$target_dir"

ln -sfn "$source_script" "$target_link"
chmod +x "$target_link"

printf 'Successfully symlinked theme-switch.sh to %s\n' "$target_link"
