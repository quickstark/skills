#!/usr/bin/env bash
set -euo pipefail
for qs_command in git node curl; do
  if ! command -v "$qs_command" >/dev/null; then
    echo "QuickStark installer requires $qs_command on PATH." >&2
    exit 1
  fi
done
qs_installer_dir=$(mktemp -d)
trap 'rm -rf "$qs_installer_dir"' EXIT
curl --fail --silent --show-error --location \
  https://raw.githubusercontent.com/quickstark/skills/main/scripts/install-skills.mjs \
  --output "$qs_installer_dir/install-skills.mjs"
node "$qs_installer_dir/install-skills.mjs" "$@"
