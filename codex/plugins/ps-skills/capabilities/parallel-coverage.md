# Parallel coverage capability

## Purpose

Cover independent evidence surfaces concurrently without losing ownership of synthesis or mutation.

## Entry conditions

Use when the scope has independent evidence partitions, each partition has a clear question, and concurrent reads cannot collide.

## Method

1. Partition by evidence surface, never by vague requests to investigate everything.
2. Assign each partition a bounded return shape and prohibit mutation.
3. Optional helpers may run concurrently when available and inherit the parent model.
4. The root validates overlaps, contradictions, and missing coverage before synthesis.

## Stop conditions

Stop fan-out when partitions overlap materially, shared state would collide, or the remaining work is smaller than coordination cost.

## Evidence

Keep the partition map, returned evidence, and root reconciliation as part of the owning root run.

## Owners

`ps-how`, `ps-why`, `ps-blast-radius`, `ps-skill-eval`.

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.
<!-- qs-progress:end -->
