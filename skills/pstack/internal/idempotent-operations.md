# Idempotent operations capability

## Purpose

Make repeated setup, verification, or cleanup operations converge safely instead of compounding side effects.

## Entry conditions

Use when the same operation may be retried after success, failure, interruption, or partial cleanup.

## Method

1. Detect current state before applying a change.
2. Make already-satisfied state a successful no-op.
3. Bind cleanup to exact resources created or confirmed by the run.
4. Verify a second execution does not corrupt state or erase evidence.

## Stop conditions

Stop when repeated execution is safe or report that the operation cannot be made safely repeatable within scope.

## Evidence

Record first-run and repeat-run outcomes as part of the owning root run.

## Owners

`ps-create-verification-skill`, `ps-maintain-verification-skill`, `ps-worktree-cleanup`.

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.
<!-- qs-progress:end -->
