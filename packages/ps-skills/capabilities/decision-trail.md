# Decision trail capability

## Purpose

Preserve enough reasoning to explain why each material mutation was kept, revised, or rejected.

## Entry conditions

Use when the owning root may change files, external state, or a measured implementation candidate.

## Method

1. Record the decision point and the evidence available at that moment.
2. Name the chosen action and the alternatives actually considered.
3. Attach the check that accepted or rejected the action.
4. Keep sensitive or temporary evidence private and summarize only what the result needs.

## Stop conditions

Stop recording when the root reaches its declared outcome or a required decision cannot be made safely.

## Evidence

Return a concise chronological ledger of material decisions as part of the owning root run.

## Owners

`ps-create-verification-skill`, `ps-maintain-verification-skill`, `ps-skill-eval`, `ps-hillclimb`, `ps-visual-parity`, `ps-pr-babysit`, `ps-worktree-cleanup`.
