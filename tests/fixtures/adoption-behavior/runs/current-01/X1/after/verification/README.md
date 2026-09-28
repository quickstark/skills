# Local calculator verification

From the project root, run `node verification/run.cjs`. Run the same command again to verify rerun safety. No arguments, dependencies, browser, credentials, or external services are needed. Node built-ins and the documented app are the entire harness.

The driver returns exit code 0 only when launch, readiness, the mapped checks, source preservation, cleanup, and evidence readback pass. Failures return nonzero and retain evidence. Each invocation creates its own `verification/evidence/run-<unique>/` directory; prior evidence is never overwritten or deleted.

## Driver interface

The CommonJS exports provide a host-neutral interface. `setup()` returns run state with evidence directory and source hashes. `launch(state, signal)` spawns `node app.cjs` and reads its ephemeral port. `doctor(state, signal)` checks readiness. `drive(state, feature, signal)` performs a bounded loopback HTTP request. `observe(state, feature, observation)` captures actual responses before comparison. `compare(observation, expected)` asserts the documented contract. `cleanup(state)` stops only the owned child and checks that its PID is gone. The CLI owns the sequence and uses cleanup in `finally`.

Launch is bounded to 3 seconds, requests to 2 seconds, and active verification to 12 seconds. Cleanup allows 2 seconds for SIGTERM and 2 seconds for a SIGKILL fallback; forced termination fails verification. SIGINT and SIGTERM cancel active checks and enter cleanup. Uncatchable termination of the driver, such as SIGKILL or host shutdown, cannot guarantee cleanup; do not kill unrelated processes to recover. A fresh run uses a new ephemeral port and evidence directory.

## Features and evidence

[features.json](features.json) records identity, setup, action, expected result, checks, availability, and evidence locations. `/health` must report readiness. `/sum?a=7&b=5` must return 12. The comparator must reject a known-bad result of 13. `/export` is a probe for documented absence and must return HTTP 404; it does not claim export functionality exists.

Each run retains `observations.json`, `stdout.log`, `stderr.log`, and `report.json`. The report contains timestamps, Node version, SHA-256 source and workflow identities, PID, port, checks, exit state, cleanup outcome, and failures. Evidence is checked after cleanup. There is no reusable PID file and cleanup never targets a process from an earlier invocation.

A sum or readiness contract mismatch is evidence of a product/contract discrepancy; launch, malformed transport, or cleanup failures require examining the recorded phase and logs before attribution. Do not repair product files as part of verification maintenance without separate authorization.

## Configuration decision

The task and [product contract](../README.md) select `verification/`. Use the real HTTP server instead of a browser or a replacement calculator. Preserve unavailable export as an explicit absence check instead of falsely marking export as implemented. Per-run hashes and responses bind those decisions to the executed artifacts. Git metadata is not usable in this fixture, so content hashes identify revisions.
