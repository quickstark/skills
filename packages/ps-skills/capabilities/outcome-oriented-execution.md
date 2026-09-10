# Outcome oriented execution capability

## Purpose

Keep an operational or optimization loop tied to one declared result instead of accumulating activity.

## Entry conditions

Use when a root may iterate, wait, repair, or remove multiple targets on the way to one outcome.

## Method

1. State the outcome, stop predicate, budget, and prohibited side effects.
2. Rank work by its direct effect on the stop predicate.
3. Reassess after each material result rather than following a stale queue.
4. End when additional activity cannot improve the declared outcome within authority.

## Stop conditions

Stop on success, exhausted budget, revoked authority, cancellation, or a blocker outside the root's scope.

## Evidence

Return the stop predicate and the final evidence against it as part of the owning root run.

## Owners

`ps-hillclimb`, `ps-pr-babysit`, `ps-worktree-cleanup`.

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.
<!-- qs-progress:end -->
