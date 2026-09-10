# Concurrency ownership capability

## Purpose

Separate concurrent work before serializing shared state so independent evidence or experiments cannot overwrite one another.

## Entry conditions

Use when multiple candidates, evidence partitions, or operational targets can progress independently.

## Method

1. Give each concurrent unit an exact scope and immutable starting point.
2. Isolate writes or make every unit read-only.
3. Optional helpers may own independent units when available and inherit the parent model.
4. Serialize accepted results through the root after checking current shared state.

## Stop conditions

Stop concurrency when scopes overlap, state has drifted, or serialization order affects correctness.

## Evidence

Keep the ownership map and serialization decisions as part of the owning root run.

## Owners

`ps-how`, `ps-why`, `ps-blast-radius`, `ps-skill-eval`, `ps-hillclimb`, `ps-pr-babysit`.

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.
<!-- qs-progress:end -->
