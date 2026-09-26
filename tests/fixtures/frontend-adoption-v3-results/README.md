# Closed native frontend comparison evidence

This is the complete closed `/tmp/qs-frontend-comparison-v3-native-20260926` evidence tree: all66 captures, all66 opaque reviewer bundles, raw native events/results, actual generated images, saved artifacts, original browser observations, and the existing `reviewer-supplements` directory. Nothing was excluded because it failed a behavioral or visual check. New F11 observations made after closure belong outside this archive.

The source supervisor reported66 requested,66 recorded, no interrupted run and no capture failures. These are capture facts only. Behavioral failures, image-resolution failures and failed observer evidence remain present; this archive does not grade, compare variants or authorize adoption. Original review judgments are managed separately by the parent and are not rewritten here. Operator metadata is preserved as opaque original bytes, not interpreted by this archival task.

## Files

- `file-manifest.json`: every original relative directory/file, mode, file size and SHA-256;3,773 files and838 directories,351,142,577 file bytes. No symlinks or special files were present.
- `frontend-v3-native.tar.zst.part-001` and `part-002`: one POSIX pax tar/Zstandard stream split in that exact order. Parts are67,108,864 and42,068,994 bytes, each below100,000,000 bytes. `archive.json` records each part and reconstructed compressed-stream hash.
- `frozen-inputs/`: exact plan, schedule, rubric, common scope and scenarios. `frozen-bindings.json` binds their original paths and bytes. Every trial’s original binding and guidance/source snapshot also remains in the full archive.
- `verify.py`: read-only archive/manifest verification, with optional extraction into a previously absent directory. Python3 and the existing `zstd` executable are required; no package installation or network call occurs.

The tar retains directory/file modes and regular-file contents. Source owner identities, access times and extended attributes are not a portability promise; the manifest’s byte/mode contract is decisive. The original source tree was rehashed after archiving and stayed identical. Source files were never edited.

## Verify or extract

From the repository root, verify the compressed parts and every streamed tar member against the complete manifest:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tests/fixtures/frontend-adoption-v3-results/verify.py
```

For extraction, choose a destination that does not exist and whose parent exists:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tests/fixtures/frontend-adoption-v3-results/verify.py --extract /tmp/qs-native-evidence-new
```

The result is `/tmp/qs-native-evidence-new/qs-frontend-comparison-v3-native-20260926/`. The command refuses an existing destination, rejects absolute/traversing/link/special tar entries, verifies file bytes while extracting, and rehashes the resulting tree. It never overwrites an existing directory. If verification fails after a fresh directory was created, that partial destination remains for diagnosis; choose another fresh path after resolving the cause. Budget roughly500MiB free temporary/extraction space.

If the original closed tree remains available, additionally compare it:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tests/fixtures/frontend-adoption-v3-results/verify.py --source /tmp/qs-frontend-comparison-v3-native-20260926
```

No command above reruns a model, browser or product test. Restoring the evidence does not turn failed outputs into successful outputs.

## Verification record

Four bounded passes were completed: inventory every original entry; compress/split and hash the entire stream; extract to the fresh `/tmp/qs-leaf67-roundtrip-20260926` and compare every original/extracted byte and mode; review path safeguards and demonstrate refusal of that now-existing destination. Full roundtrip and post-archive source comparison passed. The parent reviews the archive before final aggregation or acceptance.
