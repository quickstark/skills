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

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.
<!-- qs-progress:end -->
