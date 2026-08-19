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
