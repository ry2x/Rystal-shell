#!/usr/bin/env bash
# Exercise AGS panels while recording PSS/RSS before and after each operation.
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
COLLECTOR="$SCRIPT_DIR/collect-memory.sh"

usage() {
  cat <<'EOF'
Usage: run-memory-scenarios.sh [OPTIONS]

Options:
  --scenario NAME       launcher, launcher-no-theme, wallpaper, wallpaper-no-theme, theme-only, css-only, cc, cc-no-theme, date-weather, date-weather-no-theme, date-weather-css-only, notifications, notifications-date-weather, notifications-date-weather-repeat, notifications-date-weather-close-wait, or all (runs every scenario with AGS restart between each; default: all)
  --iterations N        Panel open/theme-change/close repetitions (default: 30)
  --notifications N     Number of random image notifications (default: 30)
  --settle-seconds N    Delay after UI and wallpaper operations (default: 2)
  --gc-wait-seconds N   Delay after clearing notifications (default: 15)
  --results-dir PATH    Output directory (default: debug/results/<timestamp>)
  --dry-run             Print planned commands without changing the desktop
  -h, --help            Show this help
EOF
}

scenario=all
iterations=30
notification_count=30
settle_seconds=2
gc_wait_seconds=15
results_dir=''
base_results_dir=''
current_results_dir=''
memory_csv=''
images_tsv=''
dry_run=false

while (($#)); do
  case "$1" in
    --scenario) scenario=${2:?missing value for --scenario}; shift 2 ;;
    --iterations) iterations=${2:?missing value for --iterations}; shift 2 ;;
    --notifications) notification_count=${2:?missing value for --notifications}; shift 2 ;;
    --settle-seconds) settle_seconds=${2:?missing value for --settle-seconds}; shift 2 ;;
    --gc-wait-seconds) gc_wait_seconds=${2:?missing value for --gc-wait-seconds}; shift 2 ;;
    --results-dir) results_dir=${2:?missing value for --results-dir}; shift 2 ;;
    --dry-run) dry_run=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'Unknown option: %s\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
done

case "$scenario" in launcher|launcher-no-theme|wallpaper|wallpaper-no-theme|theme-only|css-only|cc|cc-no-theme|date-weather|date-weather-no-theme|date-weather-css-only|notifications|notifications-date-weather|notifications-date-weather-repeat|notifications-date-weather-close-wait|all) ;; *) printf 'Invalid scenario: %s\n' "$scenario" >&2; exit 2 ;; esac
[[ $iterations =~ ^[1-9][0-9]*$ ]] || { printf '%s\n' '--iterations must be a positive integer' >&2; exit 2; }
[[ $notification_count =~ ^[1-9][0-9]*$ ]] || { printf '%s\n' '--notifications must be a positive integer' >&2; exit 2; }
[[ $settle_seconds =~ ^[0-9]+$ && $gc_wait_seconds =~ ^[0-9]+$ ]] || { printf '%s\n' 'wait values must be non-negative integers' >&2; exit 2; }

if [[ -z $results_dir ]]; then
  results_dir="$ROOT_DIR/debug/results/$(date +%Y%m%dT%H%M%S)"
fi
base_results_dir=$results_dir

configure_results_paths() {
  local scenario_name=$1

  if [[ $scenario == all ]]; then
    current_results_dir="$base_results_dir/$scenario_name"
  else
    current_results_dir=$base_results_dir
  fi

  memory_csv="$current_results_dir/memory.csv"
  images_tsv="$current_results_dir/selected-images.tsv"

  if "$dry_run"; then
    printf 'Results would be written to: %s\n' "$current_results_dir"
  else
    mkdir -p "$current_results_dir"
    printf 'scenario=%s\niterations=%s\nnotifications=%s\nsettle_seconds=%s\ngc_wait_seconds=%s\n' \
      "$scenario_name" "$iterations" "$notification_count" "$settle_seconds" "$gc_wait_seconds" > "$current_results_dir/run-info.txt"
  fi
}

require_command() {
  command -v "$1" >/dev/null || { printf 'Missing required command: %s\n' "$1" >&2; exit 1; }
}

wait_for_settle() {
  if "$dry_run"; then
    printf '+ sleep %s\n' "$1"
  else
    sleep "$1"
  fi
}

snapshot() {
  local scenario_name=$1 iteration=$2 phase=$3
  if "$dry_run"; then
    printf '+ %q --output %q --scenario %q --iteration %q --phase %q\n' \
      "$COLLECTOR" "$memory_csv" "$scenario_name" "$iteration" "$phase"
  else
    "$COLLECTOR" --output "$memory_csv" --scenario "$scenario_name" --iteration "$iteration" --phase "$phase"
  fi
}

ags_request() {
  if "$dry_run"; then
    printf '+ ags request %q\n' "$1"
  else
    ags request "$1"
  fi
}

randomize_theme() {
  if "$dry_run"; then
    printf '+ theme-switch.sh random\n'
  else
    theme-switch.sh random
  fi
}

stop_ags() {
  if "$dry_run"; then
    printf '+ killall gjs ags\n'
  else
    killall gjs ags >/dev/null 2>&1 || true
  fi
}

start_ags() {
  if "$dry_run"; then
    printf '+ ags run\n'
  else
    ags run >/dev/null 2>&1 &
  fi
  wait_for_settle "$settle_seconds"
}

restart_ags() {
  stop_ags
  start_ags
}

run_named_scenario() {
  case "$1" in
    launcher) run_panel_scenario launcher toggle-launcher ;;
    launcher-no-theme) run_launcher_no_theme_scenario ;;
    wallpaper) run_panel_scenario wallpaper toggle-wallpaper ;;
    wallpaper-no-theme) run_panel_without_theme wallpaper-no-theme toggle-wallpaper ;;
    theme-only) run_theme_only_scenario ;;
    css-only) run_css_only_scenario ;;
    cc) run_panel_scenario cc toggle-cc ;;
    cc-no-theme) run_panel_without_theme cc-no-theme toggle-cc ;;
    date-weather) run_panel_scenario date-weather toggle-notif ;;
    date-weather-no-theme) run_panel_without_theme date-weather-no-theme toggle-notif ;;
    date-weather-css-only) run_date_weather_css_only_scenario ;;
    notifications) run_notification_scenario ;;
    notifications-date-weather) run_notification_scenario true ;;
    notifications-date-weather-repeat) run_notification_scenario true 2 ;;
    notifications-date-weather-close-wait) run_notification_scenario true 1 true ;;
    *) printf 'Invalid scenario: %s\n' "$1" >&2; exit 2 ;;
  esac
}

run_all_scenarios() {
  local scenario_name
  local -a scenarios=(
    launcher
    launcher-no-theme
    wallpaper
    wallpaper-no-theme
    theme-only
    css-only
    cc
    cc-no-theme
    date-weather
    date-weather-no-theme
    date-weather-css-only
    notifications
    notifications-date-weather
    notifications-date-weather-repeat
    notifications-date-weather-close-wait
  )

  for scenario_name in "${scenarios[@]}"; do
    configure_results_paths "$scenario_name"
    restart_ags
    run_named_scenario "$scenario_name"
  done
  stop_ags
}

run_panel_scenario() {
  local name=$1 request=$2
  snapshot "$name" 0 baseline
  for ((i = 1; i <= iterations; i++)); do
    ags_request "$request"
    wait_for_settle "$settle_seconds"
    snapshot "$name" "$i" opened
    randomize_theme
    wait_for_settle "$settle_seconds"
    snapshot "$name" "$i" theme_changed
    ags_request "$request"
    wait_for_settle "$settle_seconds"
    snapshot "$name" "$i" closed
  done
}

run_launcher_no_theme_scenario() {
  run_panel_without_theme launcher-no-theme toggle-launcher
}

run_panel_without_theme() {
  local name=$1 request=$2
  snapshot "$name" 0 baseline
  for ((i = 1; i <= iterations; i++)); do
    ags_request "$request"
    wait_for_settle "$settle_seconds"
    snapshot "$name" "$i" opened
    ags_request "$request"
    wait_for_settle "$settle_seconds"
    snapshot "$name" "$i" closed
  done
}

run_theme_only_scenario() {
  snapshot theme-only 0 baseline
  for ((i = 1; i <= iterations; i++)); do
    snapshot theme-only "$i" before_theme
    randomize_theme
    wait_for_settle "$settle_seconds"
    snapshot theme-only "$i" theme_changed
  done
}

run_css_only_scenario() {
  snapshot css-only 0 baseline
  for ((i = 1; i <= iterations; i++)); do
    snapshot css-only "$i" before_css
    ags_request reload-css
    wait_for_settle "$settle_seconds"
    snapshot css-only "$i" css_reloaded
  done
}

run_date_weather_css_only_scenario() {
  snapshot date-weather-css-only 0 baseline
  ags_request toggle-notif
  wait_for_settle "$settle_seconds"
  snapshot date-weather-css-only 0 opened
  for ((i = 1; i <= iterations; i++)); do
    snapshot date-weather-css-only "$i" before_css
    ags_request reload-css
    wait_for_settle "$settle_seconds"
    snapshot date-weather-css-only "$i" css_reloaded
  done
  ags_request toggle-notif
  wait_for_settle "$settle_seconds"
  snapshot date-weather-css-only "$iterations" closed
}

run_notification_scenario() {
  local with_date_weather=${1:-false}
  local batch_count=${2:-1}
  local observe_close=${3:-false}
  local scenario_name=notifications
  local -a images=()
  local image size i batch added_phase cleared_phase settled_phase
  local image_count

  if "$with_date_weather"; then
    scenario_name=notifications-date-weather
  fi
  if "$observe_close"; then
    scenario_name=notifications-date-weather-close-wait
  fi

  image_count=$(find "$HOME/Pictures" -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' \) -print | wc -l)
  if ((image_count < notification_count)); then
    printf 'Need %s images under %s/Pictures; found %s\n' "$notification_count" "$HOME" "$image_count" >&2
    exit 1
  fi

  snapshot "$scenario_name" 0 baseline
  if "$with_date_weather"; then
    ags_request toggle-notif
    wait_for_settle "$settle_seconds"
    snapshot "$scenario_name" 0 date_weather_opened
  fi
  if ! "$dry_run"; then
    printf 'batch\tindex\tbytes\tpath\n' > "$images_tsv"
  fi
  for ((batch = 1; batch <= batch_count; batch++)); do
    if ((batch_count == 1)); then
      added_phase=added
      cleared_phase=cleared
      settled_phase=gc_settled
    else
      added_phase="batch_${batch}_added"
      cleared_phase="batch_${batch}_cleared"
      settled_phase="batch_${batch}_gc_settled"
    fi

    if "$dry_run"; then
      printf '+ select %s random PNG/JPEG/WebP files under %q (batch %s/%s)\n' "$notification_count" "$HOME/Pictures" "$batch" "$batch_count"
      printf '+ notify-send -a AGS-Memory-Test -t 0 -h string:image-path:<image> ...\n'
    else
      mapfile -d '' -t images < <(find "$HOME/Pictures" -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' \) -print0 | shuf -z -n "$notification_count")
      for ((i = 0; i < ${#images[@]}; i++)); do
        image=${images[i]}
        size=$(stat -c '%s' "$image")
        printf '%s\t%s\t%s\t%s\n' "$batch" "$((i + 1))" "$size" "$image" >> "$images_tsv"
        notify-send -a AGS-Memory-Test -t 0 -h "string:image-path:$image" \
          "Memory image test $((i + 1))/$notification_count" "$(basename "$image")"
        wait_for_settle 1
      done
    fi
    wait_for_settle "$settle_seconds"
    snapshot "$scenario_name" "$batch" "$added_phase"
    ags_request clear-notifications
    wait_for_settle "$settle_seconds"
    snapshot "$scenario_name" "$batch" "$cleared_phase"
    wait_for_settle "$gc_wait_seconds"
    snapshot "$scenario_name" "$batch" "$settled_phase"
  done
  if "$with_date_weather"; then
    ags_request toggle-notif
    if "$observe_close"; then
      snapshot "$scenario_name" "$batch_count" date_weather_close_requested
      wait_for_settle 1
      snapshot "$scenario_name" "$batch_count" date_weather_hidden_1s
      wait_for_settle 4
      snapshot "$scenario_name" "$batch_count" date_weather_hidden_5s
      wait_for_settle 10
      snapshot "$scenario_name" "$batch_count" date_weather_hidden_15s
      wait_for_settle 15
      snapshot "$scenario_name" "$batch_count" date_weather_hidden_30s
      return
    fi
    wait_for_settle "$settle_seconds"
    snapshot "$scenario_name" "$batch_count" date_weather_closed
  fi
}

for command in ags theme-switch.sh notify-send pgrep ps awk find shuf stat killall; do require_command "$command"; done
[[ -x $COLLECTOR ]] || { printf 'Collector is not executable: %s\n' "$COLLECTOR" >&2; exit 1; }

if "$dry_run"; then
  if [[ $scenario == all ]]; then
    printf 'Results would be written under: %s\n' "$base_results_dir"
  else
    configure_results_paths "$scenario"
  fi
else
  mkdir -p "$base_results_dir"
  printf 'scenario=%s\niterations=%s\nnotifications=%s\nsettle_seconds=%s\ngc_wait_seconds=%s\n' \
    "$scenario" "$iterations" "$notification_count" "$settle_seconds" "$gc_wait_seconds" > "$base_results_dir/run-info.txt"
  if [[ $scenario != all ]]; then
    configure_results_paths "$scenario"
  fi
fi

case "$scenario" in
  all) run_all_scenarios ;;
  *) run_named_scenario "$scenario" ;;
esac

if ! "$dry_run"; then
  printf 'Results written to %s\n' "$base_results_dir"
fi
