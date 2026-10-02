#!/usr/bin/env bash
# Run checks or a nested desktop without exposing the active session's services.
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
mode=${1:-desktop}
if (($#)); then shift; fi
dry_run=false
case "$mode" in
  check|desktop|smoke|probe) ;;
  --help|-h)
    cat <<'EOF'
Usage: scripts/sandbox.sh [check|desktop|smoke|probe] [--dry-run]

check    Run pnpm check and pnpm build against a disposable source copy.
desktop  Open an isolated Hyprland desktop in a window; use its key bindings.
smoke    Open the isolated desktop, exercise panels and notifications, then exit.
probe    Verify isolation without opening a window.

--dry-run prints the sandbox plan without creating files or starting processes.
Logs are saved under .dev/sandbox/. Source copies and private homes are discarded.
Requires bubblewrap, an installed Node/pnpm toolchain and project dependencies.
desktop/smoke also require Hyprland, AGS, D-Bus and a Wayland session.
EOF
    exit 0 ;;
  *) printf 'Unknown sandbox mode: %s\n' "$mode" >&2; exit 2 ;;
esac
while (($#)); do
  case "$1" in
    --dry-run) dry_run=true; shift ;;
    *) printf 'Unknown option: %s\n' "$1" >&2; exit 2 ;;
  esac
done

if "$dry_run"; then
  printf '%s\n' \
    "Mode: $mode; disposable copy of $repo_dir" \
    'Private HOME, XDG directories, PID/network/IPC namespaces and session D-Bus.' \
    'Read-only system/toolchain/dependencies; no host system bus or audio sockets.' \
    'Only desktop/smoke share the parent Wayland socket and GPU render nodes.' \
    'No deployment, installation, direnv, or host AGS requests.' \
    'Logs: .dev/sandbox/<unique-run>/; temporary source/home removed on exit.'
  exit 0
fi

require_command() {
  command -v "$1" >/dev/null || { printf 'Missing required command: %s\n' "$1" >&2; exit 1; }
}
for command in bwrap node pnpm tar realpath dbus-run-session; do require_command "$command"; done
[[ -d "$repo_dir/node_modules" ]] || {
  printf '%s\n' 'Project dependencies are missing. Install them before running the sandbox.' >&2
  exit 1
}

# Discovery runs on the host: disable dependency installation and Corepack downloads here too.
export pnpm_config_verify_deps_before_run=false
export COREPACK_ENABLE_NETWORK=0
export COREPACK_ENABLE_AUTO_PIN=0
# Resolve version-manager shims before clearing the environment.
node_path=$(pnpm exec node -p 'process.execPath')
pnpm_path=$(realpath "$(pnpm exec which pnpm)")
node_root=$(dirname "$(dirname "$node_path")")
pnpm_root=$(dirname "$(dirname "$pnpm_path")")
corepack_cache="${COREPACK_HOME:-${XDG_CACHE_HOME:-$HOME/.cache}/node/corepack}"

args=(--unshare-all --die-with-parent --new-session --cap-drop ALL --clearenv
  --ro-bind /usr /usr --ro-bind /etc /etc
  --symlink usr/bin /bin --symlink usr/bin /sbin
  --symlink usr/lib /lib --symlink usr/lib /lib64
  --proc /proc --dev /dev --tmpfs /tmp --dir /run --dir /run/user
  --dir /home/test --dir /tool-bin
  --ro-bind "$node_root" "$node_root" --ro-bind "$pnpm_root" "$pnpm_root"
  --symlink "$node_path" /tool-bin/node --symlink "$pnpm_path" /tool-bin/pnpm
  --setenv PATH /tool-bin:/work/node_modules/.bin:/work/theme-switcher:/usr/bin
  --setenv HOME /home/test --setenv USER test --setenv LOGNAME test
  --setenv LANG C.UTF-8 --setenv TERM "${TERM:-xterm-256color}"
  --setenv XDG_CONFIG_HOME /home/test/.config --setenv XDG_CACHE_HOME /home/test/.cache
  --setenv XDG_DATA_HOME /home/test/.local/share --setenv XDG_STATE_HOME /home/test/.local/state
  --dir /run/user/test --chmod 0700 /run/user/test --setenv XDG_RUNTIME_DIR /run/user/test
  --setenv COREPACK_HOME /corepack --setenv COREPACK_ENABLE_NETWORK 0
  --setenv COREPACK_ENABLE_AUTO_PIN 0
  --setenv pnpm_config_verify_deps_before_run false
  --setenv DBUS_SYSTEM_BUS_ADDRESS unix:path=/run/no-system-bus
  --setenv RYSTAL_SHELL_SANDBOX 1 --setenv RYSTAL_SHELL_INSTANCE rystal-shell-test
  --setenv RYSTAL_SHELL_DATA_DIR /work --setenv RYSTAL_SHELL_CONFIG_DIR /home/test/.config/rystal-shell
  --setenv RYSTAL_SHELL_CACHE_DIR /home/test/.cache/rystal-shell
  --setenv RYSTAL_SHELL_STATE_DIR /home/test/.local/state/rystal-shell
  --setenv RYSTAL_SHELL_RUNTIME_DIR /run/user/test/rystal-shell
  --setenv RYSTAL_SHELL_WALLPAPER_DIR /home/test/Pictures/Wallpapers
  --setenv GDK_BACKEND wayland --setenv GSK_RENDERER cairo
  --setenv NO_AT_BRIDGE 1 --setenv GTK_A11Y none)
if [[ -d "$corepack_cache" ]]; then args+=(--ro-bind "$corepack_cache" /corepack); fi

if [[ "$mode" == desktop || "$mode" == smoke ]]; then
  for command in Hyprland hyprctl ags gjs sass notify-send dbus-update-activation-environment \
    awww awww-daemon magick matugen; do require_command "$command"; done
  parent_socket="${WAYLAND_DISPLAY:-}"
  if [[ "$parent_socket" != /* ]]; then parent_socket="${XDG_RUNTIME_DIR:-}/$parent_socket"; fi
  [[ -n "${WAYLAND_DISPLAY:-}" && -S "$parent_socket" ]] || {
    printf '%s\n' 'A parent Wayland display is required; refusing to use the host desktop directly.' >&2
    exit 1
  }
  args+=(--dir /parent --ro-bind "$parent_socket" /parent/wayland
    --setenv RYSTAL_TEST_PARENT_DISPLAY /parent/wayland
    --setenv WAYLAND_DISPLAY wayland-test --setenv AQ_BACKENDS wayland
    --setenv XDG_CURRENT_DESKTOP Hyprland --setenv XDG_SESSION_TYPE wayland
    --ro-bind /sys /sys)
  render_nodes=(/dev/dri/renderD*)
  [[ -c "${render_nodes[0]}" ]] || {
    printf '%s\n' 'No GPU render node is available for nested Hyprland.' >&2
    exit 1
  }
  for device in "${render_nodes[@]}"; do args+=(--dev-bind "$device" "$device"); done
fi

# Fail closed if namespaces are unavailable; never fall back to pnpm dev.
bwrap "${args[@]}" /usr/bin/true
temporary_dir=$(mktemp -d "${TMPDIR:-/tmp}/rystal-sandbox.XXXXXXXX")
trap 'rm -rf -- "$temporary_dir"' EXIT
mkdir -p "$repo_dir/.dev/sandbox"
results_dir=$(mktemp -d "$repo_dir/.dev/sandbox/$mode.XXXXXXXX")
mkdir -p "$temporary_dir/work"
tar -C "$repo_dir" --exclude=./.git --exclude=./node_modules --exclude=./.dev \
  --exclude=./dist --exclude=./debug/results -cf - . | tar -C "$temporary_dir/work" -xf -
args+=(--bind "$temporary_dir/work" /work --ro-bind "$repo_dir/node_modules" /work/node_modules
  --bind "$results_dir" /output --chdir /work)
printf 'Sandbox logs: %s\n' "$results_dir"
# Pipe stdin from /dev/null so isolated children cannot consume the caller's terminal input.
bwrap "${args[@]}" dbus-run-session -- bash scripts/sandbox-session.sh "$mode" \
  </dev/null 2>&1 | tee "$results_dir/run.log"
