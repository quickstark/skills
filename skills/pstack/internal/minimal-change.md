# Minimal change capability

## Purpose

Prefer the smallest causal change that satisfies the declared outcome and preserves surrounding behavior.

## Entry conditions

Use whenever the owning root is authorized to mutate files or external state.

## Method

1. Identify the narrowest cause supported by evidence.
2. Remove unnecessary work before adding new machinery.
3. Keep unrelated cleanup out of the selected change.
4. Verify the intended effect and the nearest preserved invariant.

## Stop conditions

Stop when the bounded outcome is met; do not continue polishing unrelated surfaces.

## Evidence

Record the causal change and focused regression evidence as part of the owning root run.

## Owners

`ps-create-verification-skill`, `ps-maintain-verification-skill`, `ps-skill-eval`, `ps-hillclimb`, `ps-visual-parity`, `ps-pr-babysit`, `ps-worktree-cleanup`.
