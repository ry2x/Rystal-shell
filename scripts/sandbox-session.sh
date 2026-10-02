#!/usr/bin/env bash
# Internal entry point; only sandbox.sh supplies the isolated filesystem/session.
set -euo pipefail
[[ "${RYSTAL_SHELL_SANDBOX:-}" == 1 && "$PWD" == /work ]] || {
  printf '%s\n' 'Use scripts/sandbox.sh to run this entry point.' >&2
  exit 1
}

mode=${1:?missing mode}
mkdir -p "$RYSTAL_SHELL_CONFIG_DIR" "$RYSTAL_SHELL_CACHE_DIR" "$RYSTAL_SHELL_STATE_DIR" \
  "$RYSTAL_SHELL_RUNTIME_DIR" "$HOME/Pictures/Wallpapers"
cp config/config.json.template "$RYSTAL_SHELL_CONFIG_DIR/config.json"

if [[ "$mode" == probe ]]; then
  [[ ! -e /run/dbus/system_bus_socket && ! -e /run/user/1000 && ! -e /parent ]]
  [[ -z "${HYPRLAND_INSTANCE_SIGNATURE:-}" && -z "${DISPLAY:-}" && -z "${PIPEWIRE_REMOTE:-}" ]]
  [[ "$DBUS_SYSTEM_BUS_ADDRESS" == unix:path=/run/no-system-bus ]]
  [[ -n "$DBUS_SESSION_BUS_ADDRESS" ]]
  [[ $(awk 'NR > 2 && $1 != "lo:" { count++ } END { print count+0 }' /proc/net/dev) == 0 ]]
  if touch /usr/rystal-sandbox-write-probe 2>/dev/null; then
    printf '%s\n' 'System files unexpectedly writable.' >&2
    exit 1
  fi
  printf '%s\n' 'Isolation probe passed: private bus, network, home and runtime; system files read-only.'
  exit 0
fi

if [[ "$mode" == check ]]; then
  pnpm check
  pnpm build
  printf '%s\n' 'Checks and build passed in the disposable source copy.'
  exit 0
fi

install -Dm644 test/fixtures/sandbox/wallpaper.png "$RYSTAL_SHELL_WALLPAPER_DIR/wallpaper.png"
install -Dm644 test/fixtures/sandbox/avatar.png "$HOME/Profile/Profile.png"
pnpm build
compositor_pid=''
shell_pid=''
wallpaper_pid=''
cleanup() {
  if [[ -n "$shell_pid" ]]; then kill "$shell_pid" 2>/dev/null || true; fi
  if [[ -n "$wallpaper_pid" ]]; then kill "$wallpaper_pid" 2>/dev/null || true; fi
  if [[ -n "$compositor_pid" ]]; then kill "$compositor_pid" 2>/dev/null || true; fi
  wait 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

compositor_config=/work/scripts/sandbox/hyprland.lua
if ! Hyprland --verify-config --config "$compositor_config" > /output/hyprland-config.log 2>&1; then
  cat /output/hyprland-config.log >&2
  exit 1
fi
WAYLAND_DISPLAY="$RYSTAL_TEST_PARENT_DISPLAY" Hyprland \
  --config "$compositor_config" > /output/hyprland.log 2>&1 &
compositor_pid=$!
for ((attempt = 0; attempt < 150; attempt++)); do
  kill -0 "$compositor_pid" 2>/dev/null || {
    cat /output/hyprland.log >&2
    printf '%s\n' 'Nested Hyprland exited before becoming ready.' >&2
    exit 1
  }
  signatures=("$XDG_RUNTIME_DIR"/hypr/*)
  if [[ -S "${signatures[0]}/.socket.sock" ]]; then
    export HYPRLAND_INSTANCE_SIGNATURE="${signatures[0]##*/}"
    monitors=$(hyprctl -j monitors 2>/dev/null || true)
    if [[ "$monitors" == *'"name"'* ]]; then break; fi
  fi
  sleep 0.2
done
[[ -n "${HYPRLAND_INSTANCE_SIGNATURE:-}" && "${monitors:-}" == *'"name"'* ]] || {
  printf '%s\n' 'Timed out waiting for the nested compositor.' >&2
  exit 1
}
displays=("$XDG_RUNTIME_DIR"/wayland-*)
export WAYLAND_DISPLAY="${displays[0]##*/}"
[[ -S "$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY" ]] || { printf '%s\n' 'Nested display missing.' >&2; exit 1; }
dbus-update-activation-environment WAYLAND_DISPLAY HYPRLAND_INSTANCE_SIGNATURE

awww-daemon --no-cache > /output/wallpaper.log 2>&1 &
wallpaper_pid=$!
for ((attempt = 0; attempt < 100; attempt++)); do
  kill -0 "$wallpaper_pid" 2>/dev/null || { cat /output/wallpaper.log >&2; exit 1; }
  wallpaper_outputs=$(awww query 2>/dev/null || true)
  if [[ -n "$wallpaper_outputs" ]]; then break; fi
  sleep 0.2
done
[[ -n "${wallpaper_outputs:-}" ]] || { printf '%s\n' 'Wallpaper daemon did not become ready.' >&2; exit 1; }
if ! theme-switch.sh set -- "$RYSTAL_SHELL_WALLPAPER_DIR/wallpaper.png" > /output/theme.log 2>&1; then
  cat /output/theme.log >&2
  exit 1
fi

# A private PulseAudio/PipeWire server is intentionally absent.
dist/start-ags > /output/shell.log 2>&1 &
shell_pid=$!
export RYSTAL_SHELL_PID="$shell_pid"
for ((attempt = 0; attempt < 150; attempt++)); do
  kill -0 "$shell_pid" 2>/dev/null || { cat /output/shell.log >&2; exit 1; }
  response=$(timeout 2 ags request -i "$RYSTAL_SHELL_INSTANCE" help 2>/dev/null || true)
  if [[ "$response" == *'Usage:'* ]]; then break; fi
  sleep 0.2
done
[[ "${response:-}" == *'Usage:'* ]] || { printf '%s\n' 'Shell IPC did not become ready.' >&2; exit 1; }
printf '%s\n' 'Isolated desktop ready. Ctrl+Alt+Q closes it; Ctrl+Alt+{L,C,N,W,P} toggles panels.'

if [[ "$mode" == smoke ]]; then
  ./debug/collect-memory.sh --pid "$shell_pid" --output /output/memory.csv \
    --scenario sandbox-smoke --iteration 0 --phase baseline
  ./debug/run-memory-scenarios.sh --scenario launcher-no-theme --iterations 3 \
    --settle-seconds 1 --results-dir /output/launcher-memory
  ./debug/run-memory-scenarios.sh --scenario wallpaper --iterations 2 \
    --settle-seconds 3 --results-dir /output/wallpaper-memory
  for panel in toggle-launcher toggle-cc toggle-notif toggle-wallpaper toggle-power-menu; do
    response=$(ags request -i "$RYSTAL_SHELL_INSTANCE" "$panel")
    [[ "$response" != Error:* ]] || { printf '%s\n' "$response" >&2; exit 1; }
    sleep 0.5
    ./debug/collect-memory.sh --pid "$shell_pid" --output /output/memory.csv \
      --scenario sandbox-smoke --iteration 1 --phase "$panel-opened"
    if command -v grim >/dev/null; then
      if ! timeout 10 grim "/output/$panel.png"; then
        printf 'Failed to capture %s within 10 seconds; inspect hyprland.log.\n' "$panel" >&2
        exit 1
      fi
    fi
    ags request -i "$RYSTAL_SHELL_INSTANCE" "$panel"
  done
  notify-send -a Rystal-Sandbox 'Sandbox notification' 'Private session bus test'
  sleep 1
  ags request -i "$RYSTAL_SHELL_INSTANCE" clear-notifications
  sleep 2
  ./debug/collect-memory.sh --pid "$shell_pid" --output /output/memory.csv \
    --scenario sandbox-smoke --iteration 1 --phase settled
  if grep -Eq 'JS ERROR:|JS SyntaxError:|JS ReferenceError:|Failed to load profile avatar:' /output/shell.log; then
    printf '%s\n' 'UI exception or profile image load failure detected; inspect shell.log.' >&2
    exit 1
  fi
  printf '%s\n' 'Panel and notification smoke test passed.'
else
  # Either process exiting must end the run, even if the other is still alive.
  wait -n "$compositor_pid" "$shell_pid" "$wallpaper_pid"
fi
