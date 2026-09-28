# Parallel coverage capability

## Purpose

Cover independent evidence surfaces concurrently without losing ownership of synthesis or mutation.

## Entry conditions

Use when the scope has independent evidence partitions, each partition has a clear question, and concurrent reads cannot collide.

## Method

1. Partition by evidence surface, never by vague requests to investigate everything.
2. Assign each partition a bounded return shape, exact source revision or content hash, and prohibit mutation. Measurement briefs also specify sample count, sample definition, and execution order; returned evidence must record these same bindings.
3. Optional helpers may run concurrently when available and inherit the parent model.
4. The root validates returned bindings, overlaps, contradictions, and missing coverage before synthesis. Reject stale revisions, mismatched sampling methods or order, missing workers, and unsupported success claims as coverage gaps; rerun only within the declared budget. A gap is not a pass.

## Stop conditions

Stop fan-out when partitions overlap materially, shared state would collide, or the remaining work is smaller than coordination cost.

## Evidence

Keep the partition map, returned evidence, and root reconciliation as part of the owning root run.

## Owners

`qs-how`, `qs-why`, `qs-blast-radius`, `qs-skill-eval`.

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.

Contribute observed partial work, remaining effort, uncertainty, and revision-bound evidence for the parent's stage and overall estimates. Waiting, elapsed time, token consumption, or a running process alone earns no progress. Flag invalidated evidence so the parent can lower estimates and reopen checks. Preserve valid evidence for resumption; do not count the same work twice or report an independent public percentage. Only the parent computes weighted progress and verifies 100% completion.
<!-- qs-progress:end -->
