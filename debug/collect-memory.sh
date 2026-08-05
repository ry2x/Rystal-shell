#!/usr/bin/env bash
# Record the memory footprint of the GJS process that runs this AGS instance.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: collect-memory.sh --output FILE --scenario NAME --iteration N --phase NAME

Appends one CSV row containing PSS/RSS values from /proc/<pid>/smaps_rollup.
EOF
}

output=''
scenario=''
iteration=''
phase=''

while (($#)); do
  case "$1" in
    --output) output=${2:?missing value for --output}; shift 2 ;;
    --scenario) scenario=${2:?missing value for --scenario}; shift 2 ;;
    --iteration) iteration=${2:?missing value for --iteration}; shift 2 ;;
    --phase) phase=${2:?missing value for --phase}; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'Unknown option: %s\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z $output || -z $scenario || -z $iteration || -z $phase ]]; then
  usage >&2
  exit 2
fi

mapfile -t pids < <(pgrep -u "$UID" -f 'gjs -m .*/ags\.js' || true)
if ((${#pids[@]} != 1)); then
  printf 'Expected exactly one AGS GJS process, found %s: %s\n' "${#pids[@]}" "${pids[*]:-none}" >&2
  exit 1
fi

pid=${pids[0]}
rollup="/proc/$pid/smaps_rollup"
if [[ ! -r $rollup ]]; then
  printf 'Cannot read %s\n' "$rollup" >&2
  exit 1
fi

pss_kb=$(awk '$1 == "Pss:" { print $2; exit }' "$rollup")
rss_kb=$(awk '$1 == "Rss:" { print $2; exit }' "$rollup")
swap_kb=$(awk '$1 == "Swap:" { print $2; exit }' "$rollup")
read -r ps_rss_kb vsz_kb < <(ps -o rss=,vsz= -p "$pid" | awk '{ print $1, $2 }')

mkdir -p "$(dirname "$output")"
if [[ ! -s $output ]]; then
  printf 'timestamp,scenario,iteration,phase,pid,pss_kb,rss_kb,swap_kb,ps_rss_kb,vsz_kb\n' > "$output"
fi
printf '%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n' \
  "$(date --iso-8601=seconds)" "$scenario" "$iteration" "$phase" "$pid" \
  "$pss_kb" "$rss_kb" "$swap_kb" "$ps_rss_kb" "$vsz_kb" >> "$output"
