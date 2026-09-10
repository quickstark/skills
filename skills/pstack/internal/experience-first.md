# Experience first capability

## Purpose

Judge an implementation through the real user-visible or workload-visible experience before optimizing internal elegance.

## Entry conditions

Use when a visual surface or performance metric represents an actual user outcome.

## Method

1. Reproduce the representative experience under controlled conditions.
2. Name the visible or measurable deficiency before proposing a change.
3. Prefer changes that improve the declared experience without weakening correctness.
4. Re-run the same experience after each accepted change.

## Stop conditions

Stop when the declared experience meets its criterion or the remaining gap needs a new product decision.

## Evidence

Keep baseline and final observations from the same path as part of the owning root run.

## Owners

`ps-visual-parity`, `ps-hillclimb`.

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.
<!-- qs-progress:end -->
