# Concurrency ownership capability

## Purpose

Separate concurrent work before serializing shared state so independent evidence or experiments cannot overwrite one another.

## Entry conditions

Use when multiple candidates, evidence partitions, or operational targets can progress independently.

## Method

1. Give each concurrent unit an exact scope and immutable starting point.
2. Isolate output paths or make every unit read-only. When shared writes are unavoidable, use a structural lock or serialize them; a prose ownership map alone is not mutual exclusion.
3. When the host provides subagents, give each independent unit to a helper started with a fresh context window, not a fork of the parent conversation; helpers inherit the parent model and own only their declared scope. Without subagent support, run the units serially in the root.
4. Serialize accepted results through the root after checking current shared state.
5. Require a consumed prerequisite outcome for each dependency; do not confuse scheduling preference with readiness. Repair only the failed scope, preserving accepted independent work while invalidating affected evidence after shared-state changes. The root still verifies the integrated result; writer ownership never expands authority or grants filesystem isolation.

## Stop conditions

Stop concurrency when scopes overlap, state has drifted, or serialization order affects correctness.

## Evidence

Keep the ownership map and serialization decisions as part of the owning root run.

## Owners

`qs-how`, `qs-why`, `qs-blast-radius`, `qs-skill-eval`, `qs-hillclimb`, `qs-pr-babysit`.

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.

Contribute observed partial work, remaining effort, uncertainty, and revision-bound evidence for the parent's stage and overall estimates. Waiting, elapsed time, token consumption, or a running process alone earns no progress. Flag invalidated evidence so the parent can lower estimates and reopen checks. Preserve valid evidence for resumption; do not count the same work twice or report an independent public percentage. Only the parent computes weighted progress and verifies 100% completion.
<!-- qs-progress:end -->
