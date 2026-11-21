#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPO"
exec node --input-type=module - <<'JS'
import { listPublicSources } from './scripts/sync-v3-docs.mjs';
console.log((await listPublicSources()).join('\n'));
JS
