# Bounded process observation amendment

The first full comparison attempted only `F01-r1-v31`. Its CLI child exited, but the supervisor was still waiting for process-observation work. The monitor appended a whole-host `/proc` scan every 100 ms to an unbounded promise chain; shutdown appended another scan and awaited the backlog. The parent stopped the exact identified supervisor after graceful shutdown failed and retained the incomplete row, raw events, partial workspace and stop receipts. No complete response/telemetry record or candidate result was available for comparison.

`amended-sampling-plan.json` binds the prior plan and runner snapshots under `frozen-v2/`, the finalized original output directory and supervisor log, and the ten remaining files in the original F01 workspace. Prior sources, shared facts, rubric, schedule and host controls are unchanged. The earlier failed initialization and corrected prompt-only pilot remain separate historical evidence. A small pre-launch reporting revision also preserves its draft runner/plan snapshots: process-observation failures are included directly in independent reviewer context as well as telemetry.

The new monitor permits one observation pass at a time. It skips overlapping ticks and waits only for the current pass at shutdown. It follows the CLI leader, already observed owned PIDs, and their `/proc/<pid>/task/<tid>/children` entries; it never enumerates the host's `/proc` root. Child entries must still have the expected parent and process identity. Count/time guards stop excessive observation work; unexpected scan or cleanup errors are recorded as incomplete. Cleanup signals only identities that still match observed ownership. An unseen process that detached and reparented between samples is not proven absent; the observer does not claim whole-host process coverage or a new security boundary.

The parent explicitly authorized **one** infrastructure replacement of the incomplete F01 baseline in a fresh complete 66-row run. Exactly `F01-r1-v31` is labeled `parent-authorized-infrastructure-replacement`; the other 65 rows are first attempts. The original attempted row remains preserved and incomplete. This corrects a known harness failure before candidate evidence, rather than choosing a preferred semantic result. The original 11 × 3 × 2 schedule, quality rubric, model inputs and budgets are unchanged. There are no further retries or automatic resets; new missing/failed rows remain missing/failed for the parent's adoption assessment.

Verify and run the 14 local controls without invoking a model:

```sh
node scripts/frontend-adoption-trials.mjs verify
FRONTEND_BROWSER=/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell \
FRONTEND_PUPPETEER=/tmp/qs-hf-probe/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js \
node --test tests/fixtures/frontend-adoption/harness.test.mjs tests/fixtures/frontend-adoption/sampling-harness.test.mjs
```

After review, the parent launches and owns the following command through `exec_command require_escalated`, preserving the existing CLI runtime-write interface and default model/reasoning/sandbox/approval configuration. The output directory must not already exist; the command rejects other paths, a missing explicit declaration and legacy `compare` restarts.

```sh
FRONTEND_BROWSER=/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell \
FRONTEND_PUPPETEER=/tmp/qs-hf-probe/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js \
node scripts/frontend-adoption-trials.mjs continue /tmp/qs-frontend-comparison-sampling-amended-20260925 --parent-approved-infrastructure-replacement
```

The new attempt schedule, supervisor lock and every row binding name the active plan and attempt type. The supervisor reports nonzero when execution has missing or failed rows; successful execution still requires independent behavioral and quality review. The preparation helper has invoked no model under this amendment and has graded no candidate or baseline output.
