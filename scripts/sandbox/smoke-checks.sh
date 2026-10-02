#!/usr/bin/env bash
# Shared by the isolated session and memory scenarios; no work is done until called.

checked_ags_request() {
  local response
  if ! response=$(ags request -i "$RYSTAL_SHELL_INSTANCE" "$@"); then
    printf 'AGS request failed (%s): %s\n' "$*" "$response" >&2
    return 1
  fi
  if [[ "$response" == Error:* ]]; then
    printf 'AGS request failed (%s): %s\n' "$*" "$response" >&2
    return 1
  fi
  printf '%s\n' "$response"
}

check_shell_log() {
  local log_file=$1
  # Gnim reports invalid child mutations with console.error(TypeError(...)). GJS records
  # those as a domain-specific CRITICAL message rather than an uncaught "JS ERROR".
  local error_pattern='JS ERROR:|SyntaxError:|ReferenceError:|TypeError:|Error: cannot (add|remove) |Failed to load profile avatar:'
  error_pattern+='|Error: out of tracking context: will not be able to cleanup|Error: cannot attach onMount: out of tracking context'
  if [[ ! -r "$log_file" ]] || grep -Eq "$error_pattern" "$log_file"; then
    printf 'UI exception, rendering error or profile image load failure detected; inspect %s.\n' "$log_file" >&2
    return 1
  fi
}
