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

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.
<!-- qs-progress:end -->
