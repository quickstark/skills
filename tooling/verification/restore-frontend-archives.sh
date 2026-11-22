#!/usr/bin/env bash
set -euo pipefail

if (( $# != 0 )); then
  printf '%s\n' 'Usage: bash tooling/verification/restore-frontend-archives.sh' >&2
  exit 2
fi

repo=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)
revision=f1324e8b81311f2ee3209ab35808011db29a5d52
source="https://raw.githubusercontent.com/quickstark/skills/$revision/tests/fixtures"
work=$(mktemp -d "${TMPDIR:-/tmp}/qs-frontend-archives.XXXXXXXX")
trap 'rm -rf -- "$work"' EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

restore_group() {
  local group=$1 prefix=$2
  local inputs="$repo/tests/fixtures/$group"
  local output="$work/.incoming/$group"
  mkdir -p -- "$output"
  cp -R -- "$inputs/archive.json" "$inputs/file-manifest.json" \
    "$inputs/frozen-bindings.json" "$inputs/frozen-inputs" "$inputs/verify.py" "$output/"
  local part
  for part in "$prefix.part-001" "$prefix.part-002"; do
    curl --disable --fail --silent --show-error --location \
      --proto '=https' --proto-redir '=https' --connect-timeout 15 --max-time 180 \
      --max-filesize 100000000 --output "$output/$part" "$source/$group/$part"
  done
  python3 -I -B "$output/verify.py" --extract "$output/extracted" >&2
}

restore_group frontend-adoption-v3-results frontend-v3-native.tar.zst
restore_group frontend-mobile-repair-results mobile-native.tar.zst
mv -- "$work/.incoming" "$work/verified"
trap - EXIT HUP INT TERM
printf '%s\n' "$work/verified"
