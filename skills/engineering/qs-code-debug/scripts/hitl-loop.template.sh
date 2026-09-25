#!/usr/bin/env bash
# Human-in-the-loop reproduction loop. Copy and adapt the selected steps.
# The agent runs this script; the user performs sign-in outside it.
#
# Usage: bash hitl-loop.template.sh
# step "instruction"              -> show instruction and wait for Enter
# capture VAR "question" choices  -> accept one declared observation
#
# Captured observations may be echoed to the terminal and read by the agent.
# Never capture credentials or raw auth-bearing errors. Use fixed diagnostic
# choices; this helper is not a general-purpose freeform secret scrubber.

set -euo pipefail

step() {
  printf '\n>>> %s\n' "$1"
  read -r -s -p "    [Enter when done] " _
  printf '\n'
}

capture() {
  local var="$1" question="$2" answer choice
  shift 2
  if [[ $# -eq 0 ]]; then
    printf 'capture requires declared safe choices.\n' >&2
    return 1
  fi
  printf '\n>>> %s\n' "$question"
  # Suppress terminal echo as well as rejecting undeclared values below.
  read -r -s -p "    > " answer
  printf '\n'
  for choice in "$@"; do
    if [[ "$answer" == "$choice" ]]; then
      printf -v "$var" '%s' "$answer"
      return 0
    fi
  done
  printf 'Observation rejected; choose a listed value. Input withheld.\n' >&2
  return 1
}

# --- edit below ---------------------------------------------------------
# Keep each choice a fixed, non-sensitive observation, never a secret value.
step "Open the app at http://localhost:3000 and sign in outside this capture loop."

capture ERRORED "Click Export. Did it fail? (y/n)" y n
capture ERROR_KIND "Inspect the error locally. Category? (none/validation/network/authorization/other)" \
  none validation network authorization other

# Inspect any additional diagnostic evidence locally and redact it before sharing.
# Do not add a raw error-message capture here.
# --- edit above ---------------------------------------------------------

printf '\n--- Captured ---\n'
printf 'ERRORED=%s\n' "$ERRORED"
printf 'ERROR_KIND=%s\n' "$ERROR_KIND"
