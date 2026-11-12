LEX-12 isolated runtime evidence

Scope: source commit 41716d7b52278faecd446539a8aa1814aeb0dd47. All outputs confined to this /tmp directory. No repository edits, installations, registration, hooks, settings, runtime pin changes, model trials, downloads or publication.

Fresh execution:
- node /tmp/qs-lex-runtime-st2tih6o/probe-unlazy.mjs: normal subprocess access approved; fresh-run contains eight expected-exit probes with independent source-row arithmetic oracle (22+21+40=83). Check commands, stdout/stderr, ledger snapshots, output/evidence digests are preserved. Exact source private closure verified separately.
- Existing exact-profile Chrome --version: exit 0, 151.0.7922.34; binary hash matches historical binding. No browser launch or sandbox exception attempted.
- node skills/video/qs-video/scripts/caption-runtime.cjs preflight-render <staged fixture>: exit 3, missing selected CLI, fixture byte-identical before/after. No dependent render attempted.
- python3 verify-retained.py: fresh stdlib inspection of unchanged historical PNG/WAV and hash verification of native video and 97 embedded-caption manifest entries. This reuses old runtime evidence and does not claim a new render, matting, decoded rendered-audio or speech-recognition pass.

Gaps: exact bound /tmp/qs-hf-probe HyperFrames0.8.77, FFmpeg and FFprobe are absent; no selected env or PATH alternative exists. No acquisition attempted. Prior network logs are historical; no new runtime network-capable CLI/browser launch occurred.

Attempt history: initial sandboxed nested spawnSync reported EPERM and an incomplete probe. The subsequent normal-process attempt found an approval left in that first fixture and failed its unapproved-control expectation. Neither attempt is treated as a pass. The final eight-probe run used a separate fresh fixture and approval directory and passed every expected outcome. These logs remain for provenance.
