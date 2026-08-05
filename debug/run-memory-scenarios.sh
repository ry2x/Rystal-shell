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
  --scenario NAME       launcher, launcher-no-theme, theme-only, css-only, cc, cc-no-theme, date-weather, date-weather-no-theme, date-weather-css-only, notifications, notifications-date-weather, or all (default: all)
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

case "$scenario" in launcher|launcher-no-theme|theme-only|css-only|cc|cc-no-theme|date-weather|date-weather-no-theme|date-weather-css-only|notifications|notifications-date-weather|all) ;; *) printf 'Invalid scenario: %s\n' "$scenario" >&2; exit 2 ;; esac
[[ $iterations =~ ^[1-9][0-9]*$ ]] || { printf '%s\n' '--iterations must be a positive integer' >&2; exit 2; }
[[ $notification_count =~ ^[1-9][0-9]*$ ]] || { printf '%s\n' '--notifications must be a positive integer' >&2; exit 2; }
[[ $settle_seconds =~ ^[0-9]+$ && $gc_wait_seconds =~ ^[0-9]+$ ]] || { printf '%s\n' 'wait values must be non-negative integers' >&2; exit 2; }

if [[ -z $results_dir ]]; then
  results_dir="$ROOT_DIR/debug/results/$(date +%Y%m%dT%H%M%S)"
fi
memory_csv="$results_dir/memory.csv"
images_tsv="$results_dir/selected-images.tsv"

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
    printf '+ waypaper --random\n'
  else
    waypaper --random
  fi
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
  local scenario_name=notifications
  local -a images=()
  local image size i
  local image_count

  if "$with_date_weather"; then
    scenario_name=notifications-date-weather
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
  if "$dry_run"; then
    printf '+ select %s random PNG/JPEG/WebP files under %q\n' "$notification_count" "$HOME/Pictures"
    printf '+ notify-send -a AGS-Memory-Test -t 0 -h string:image-path:<image> ...\n'
  else
    mapfile -d '' -t images < <(find "$HOME/Pictures" -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' \) -print0 | shuf -z -n "$notification_count")
    printf 'index\tbytes\tpath\n' > "$images_tsv"
    for ((i = 0; i < ${#images[@]}; i++)); do
      image=${images[i]}
      size=$(stat -c '%s' "$image")
      printf '%s\t%s\t%s\n' "$((i + 1))" "$size" "$image" >> "$images_tsv"
      notify-send -a AGS-Memory-Test -t 0 -h "string:image-path:$image" \
        "Memory image test $((i + 1))/$notification_count" "$(basename "$image")"
      wait_for_settle 1
    done
  fi
  wait_for_settle "$settle_seconds"
  snapshot "$scenario_name" "$notification_count" added
  ags_request clear-notifications
  wait_for_settle "$settle_seconds"
  snapshot "$scenario_name" "$notification_count" cleared
  wait_for_settle "$gc_wait_seconds"
  snapshot "$scenario_name" "$notification_count" gc_settled
  if "$with_date_weather"; then
    ags_request toggle-notif
    wait_for_settle "$settle_seconds"
    snapshot "$scenario_name" "$notification_count" date_weather_closed
  fi
}

for command in ags waypaper notify-send pgrep ps awk find shuf stat; do require_command "$command"; done
[[ -x $COLLECTOR ]] || { printf 'Collector is not executable: %s\n' "$COLLECTOR" >&2; exit 1; }

if "$dry_run"; then
  printf 'Results would be written to: %s\n' "$results_dir"
else
  mkdir -p "$results_dir"
  printf 'scenario=%s\niterations=%s\nnotifications=%s\nsettle_seconds=%s\ngc_wait_seconds=%s\n' \
    "$scenario" "$iterations" "$notification_count" "$settle_seconds" "$gc_wait_seconds" > "$results_dir/run-info.txt"
fi

case "$scenario" in
  launcher) run_panel_scenario launcher toggle-launcher ;;
  launcher-no-theme) run_launcher_no_theme_scenario ;;
  theme-only) run_theme_only_scenario ;;
  css-only) run_css_only_scenario ;;
  cc) run_panel_scenario cc toggle-cc ;;
  cc-no-theme) run_panel_without_theme cc-no-theme toggle-cc ;;
  date-weather) run_panel_scenario date-weather toggle-notif ;;
  date-weather-no-theme) run_panel_without_theme date-weather-no-theme toggle-notif ;;
  date-weather-css-only) run_date_weather_css_only_scenario ;;
  notifications) run_notification_scenario ;;
  notifications-date-weather) run_notification_scenario true ;;
  all)
    run_panel_scenario launcher toggle-launcher
    run_panel_scenario cc toggle-cc
    run_panel_scenario date-weather toggle-notif
    run_notification_scenario
    ;;
esac

if ! "$dry_run"; then
  printf 'Results written to %s\n' "$results_dir"
fi
