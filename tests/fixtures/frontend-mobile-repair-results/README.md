# Closed native portrait mobile qualification evidence

This archive preserves every entry from `/tmp/qs-frontend-mobile-native-qualification-20260926`: all six captures and opaque reviewer bundles, raw native/normalized events, prompts, responses, before/after files, process/telemetry evidence, actual image bytes and any failures. No quality-based exclusions were made. Operator metadata is retained as original evidence, not used here to grade outputs.

The supervisor reported six settled captures, no interruption and no capture failures. These are capture facts only. Independent visual review was pending under leaf69 at archival time; the parent had already reported a candidate brand failure. This archive grants no quality acceptance or adoption. Original F09 remains failed, including its unmet exact1179×2556 requirement and other per-output defects. This separate native portrait qualification cannot be pooled with, regrade or replace F09, and establishes no exact-resolution support.

## Preserved files and bindings

- `file-manifest.json` lists every original entry:182 files,49 directories and172,299,619 file bytes, with relative paths, modes, sizes and SHA-256. There are24 raster file occurrences with12 distinct image hashes. Raw event copies and embedded image results also remain intact.
- `mobile-native.tar.zst.part-001` and `part-002` form one POSIX pax tar/Zstandard stream in that order. Parts are67,108,864 and20,563,112 bytes, each below100,000,000 bytes. `archive.json` binds both parts and the87,671,976-byte reconstructed stream.
- `frozen-inputs/` preserves the entire qualification preparation directory, including the exact plan, criteria, six-row schedule, source snapshots/proposed patch, launcher/tests and actual exclusive run claim. Preparation-stage statements inside those snapshots remain historical statements. `frozen-bindings.json` records every copied byte and source path.
- The plan SHA-256 is `93e2e0542c7be75701fd6e587dba96b6b2286d7e2a052fe0e067121009026e9c`. Every trial binding and run claim matches it. Recorder/dependency hashes remain in the plan; each actually used verbatim guidance body is also preserved in trial before/after directories.
- `verify.py` checks compressed parts, complete streamed tar membership, every file hash/mode and frozen input binding. It runs no model, browser, product code, network call or installation.

Directory/file modes and regular-file bytes are preserved. Owner identities, access times and extended attributes are not a portability promise. The full original tree was rehashed after archiving and after extraction; it stayed unchanged.

## Verify or extract

Python3 and the existing `zstd` executable are required. From the repository root, verify without extracting evidence:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tests/fixtures/frontend-mobile-repair-results/verify.py
```

To extract, choose a destination that does not exist and whose parent exists:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tests/fixtures/frontend-mobile-repair-results/verify.py --extract /tmp/qs-mobile-evidence-new
```

The restored root will be `/tmp/qs-mobile-evidence-new/qs-frontend-mobile-native-qualification-20260926/`. Verification refuses an existing destination and rejects absolute, traversing, duplicate, link or special tar entries. It verifies bytes while extracting and rehashes the extracted tree. A partial destination remains if verification fails; resolve the cause before choosing another fresh path. Allow roughly300MiB temporary/extraction space.

If the unchanged original remains available, compare it too:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tests/fixtures/frontend-mobile-repair-results/verify.py --source /tmp/qs-frontend-mobile-native-qualification-20260926
```

## Verification scope

The four passes covered complete inventory/plan binding; compression and every archived byte; a fresh roundtrip to `/tmp/qs-leaf71-roundtrip-20260926` with full original/extracted hash and mode checks; and safeguard/wording review including refusal to overwrite that existing destination. Results are recorded in `verification.json`. All archive processes finished. Parent owns acceptance and any later quality conclusions; restoring evidence does not repair failed outputs.
