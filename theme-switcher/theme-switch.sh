#!/usr/bin/env bash

# SPDX-FileCopyrightText: 2026 Ry2X
# SPDX-License-Identifier: GPL-3.0-or-later

set -euo pipefail

script_path="$(readlink -f -- "${BASH_SOURCE[0]}")"
script_dir="$(cd "$(dirname "$script_path")" && pwd)"
template="$script_dir/theme.scss.template"
matugen_config="$script_dir/matugen.toml"
config_root="${RYSTAL_SHELL_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/rystal-shell}"
state_root="${RYSTAL_SHELL_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/rystal-shell}/theme"
if [[ -n "${RYSTAL_SHELL_RUNTIME_DIR:-}" ]]; then
    runtime_root="$RYSTAL_SHELL_RUNTIME_DIR/theme"
elif [[ -n "${XDG_RUNTIME_DIR:-}" ]]; then
    runtime_root="$XDG_RUNTIME_DIR/rystal-shell/theme"
else
    runtime_root="/tmp/rystal-shell-$UID/theme"
fi
wallpaper_root="${RYSTAL_SHELL_WALLPAPER_DIR:-$HOME/Pictures/Wallpapers}"
instance="${RYSTAL_SHELL_INSTANCE:-rystal-shell}"
current_file="$state_root/current-wallpaper"
mode_file="$state_root/mode"
lock_file="$runtime_root/lock"

usage() {
    cat <<'EOF'
Usage:
  theme-switch.sh [--dark|--light] set FILE
  theme-switch.sh [--dark|--light] random
  theme-switch.sh [--dark|--light] refresh
  theme-switch.sh mode {dark|light}
  theme-switch.sh toggle
  theme-switch.sh status
EOF
}

die() {
    printf 'theme-switch: %s\n' "$1" >&2
    exit 1
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

atomic_write() {
    local destination="$1"
    local value="$2"
    local temporary="${destination}.tmp.$$"

    printf '%s\n' "$value" >"$temporary"
    mv -f -- "$temporary" "$destination"
}

read_saved_mode() {
    local saved_mode=""

    if [[ -s "$mode_file" ]]; then
        IFS= read -r saved_mode <"$mode_file"
    fi

    case "$saved_mode" in
    dark | light) printf '%s\n' "$saved_mode" ;;
    "") printf 'dark\n' ;;
    *)
        printf 'theme-switch: Invalid saved mode %q; using dark\n' "$saved_mode" >&2
        printf 'dark\n'
        ;;
    esac
}

read_current_wallpaper() {
    [[ -s "$current_file" ]] || die "No current wallpaper has been recorded"
    IFS= read -r wallpaper_path <"$current_file"
}

is_supported_wallpaper() {
    case "${1,,}" in
    *.jpg | *.jpeg | *.png | *.webp | *.gif) return 0 ;;
    *) return 1 ;;
    esac
}

choose_random_wallpaper() {
    local -a wallpapers=()

    [[ -d "$wallpaper_root" ]] || die "Wallpaper directory does not exist: $wallpaper_root"
    mapfile -d '' wallpapers < <(
        find "$wallpaper_root" -type f \
            \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' -o -iname '*.gif' \) \
            -print0
    )
    ((${#wallpapers[@]} > 0)) || die "No wallpapers found in $wallpaper_root"
    printf '%s\n' "${wallpapers[RANDOM % ${#wallpapers[@]}]}"
}

mode=""
mode_explicit=false
command_name=""
command_arg=""

while (($# > 0)); do
    case "$1" in
    --dark | --light)
        mode="${1#--}"
        mode_explicit=true
        ;;
    set | random | refresh | mode | toggle | status)
        [[ -z "$command_name" ]] || die "Only one command may be specified"
        command_name="$1"
        ;;
    -h | --help)
        usage
        exit 0
        ;;
    --)
        shift
        (($# == 1)) || die "-- must be followed by exactly one wallpaper path"
        command_arg="$1"
        shift
        break
        ;;
    -*) die "Unknown option: $1" ;;
    *)
        [[ -z "$command_arg" ]] || die "Unexpected argument: $1"
        command_arg="$1"
        ;;
    esac
    shift
done

[[ -n "$command_name" ]] || {
    usage >&2
    exit 2
}

case "$command_name" in
status)
    ! $mode_explicit || die "status does not accept --dark or --light"
    [[ -z "$command_arg" ]] || die "status does not accept arguments"
    read_saved_mode
    exit 0
    ;;
mode)
    ! $mode_explicit || die "mode does not accept --dark or --light"
    case "$command_arg" in
    dark | light) mode="$command_arg" ;;
    *) die "mode requires exactly one value: dark or light" ;;
    esac
    ;;
toggle)
    ! $mode_explicit || die "toggle does not accept --dark or --light"
    [[ -z "$command_arg" ]] || die "toggle does not accept arguments"
    ;;
set | random | refresh)
    :
    ;;
esac

mkdir -p "$state_root" "$runtime_root" "$config_root/assets"
require_command flock
require_command magick
require_command matugen
if [[ "$command_name" == set || "$command_name" == random ]]; then
    require_command awww
fi
[[ -f "$template" ]] || die "Theme template not found: $template"
[[ -f "$matugen_config" ]] || die "Matugen config not found: $matugen_config"

exec 9>"$lock_file"
flock 9

case "$command_name" in
toggle)
    mode=$(read_saved_mode)
    [[ "$mode" == dark ]] && mode=light || mode=dark
    ;;
set | random | refresh)
    $mode_explicit || mode=$(read_saved_mode)
    ;;
esac

case "$command_name" in
set)
    [[ -n "$command_arg" ]] || die "set requires a wallpaper path"
    wallpaper_path=$(readlink -f -- "$command_arg") || die "Cannot resolve wallpaper: $command_arg"
    ;;
random)
    [[ -z "$command_arg" ]] || die "random does not accept a wallpaper path"
    wallpaper_path=$(choose_random_wallpaper)
    ;;
refresh | mode | toggle)
    [[ -z "$command_arg" || "$command_name" == mode ]] || die "$command_name does not accept arguments"
    read_current_wallpaper
    ;;
esac

[[ -f "$wallpaper_path" ]] || die "Wallpaper does not exist: $wallpaper_path"
is_supported_wallpaper "$wallpaper_path" || die "Unsupported wallpaper format: $wallpaper_path"
[[ "$wallpaper_path" != *$'\n'* && "$wallpaper_path" != *$'\t'* ]] || die "Tabs and newlines are not supported in wallpaper paths"

stage="$(mktemp -d "$runtime_root/.theme.XXXXXX")"
trap 'rm -rf -- "$stage"' EXIT
cp -- "$template" "$stage/theme.scss.template"

prefer=darkness
[[ "$mode" == light ]] && prefer=lightness
HOME="$stage" matugen image "$wallpaper_path" -m "$mode" -c "$matugen_config" --prefer "$prefer" --quiet ||
    die "Matugen failed for: $wallpaper_path"

magick "${wallpaper_path}[0]" -strip -thumbnail 500x500^ -gravity center -extent 500x500 \
    \( +clone -fill white -colorize 100 \
    -fill 'gray(30%)' -draw 'polygon 400,500 500,500 500,0 450,0' \
    -fill black -draw 'polygon 500,500 500,0 450,500' \) \
    -alpha off -compose CopyOpacity -composite \
    "png:$stage/launcher_bg.png" || die "Image asset generation failed for: $wallpaper_path"

if [[ "$command_name" == set || "$command_name" == random ]]; then
    awww img --resize crop --transition-type random --transition-duration 2 \
        --transition-fps 60 --transition-step 5 "$wallpaper_path" || die "awww failed to set the wallpaper"
fi

mv -f -- "$stage/theme.scss" "$config_root/theme.scss"
mv -f -- "$stage/launcher_bg.png" "$config_root/assets/launcher_bg.png"
atomic_write "$current_file" "$wallpaper_path"
atomic_write "$mode_file" "$mode"

if command -v ags >/dev/null 2>&1 && ags list 2>/dev/null | grep -Fxq "$instance"; then
    ags request -i "$instance" reload-css >/dev/null || die "AGS failed to reload its stylesheet"
fi
