# Context discipline capability

## Purpose

Reduce large evidence sets into decision-grade findings without discarding provenance or flooding the root context.

## Entry conditions

Use when traces, histories, logs, or cross-module searches are too large for direct synthesis.

## Method

1. Define the exact question and smallest useful return shape.
2. Partition or filter large evidence before interpretation.
3. Optional bounded helpers may inspect partitions when available and inherit the parent model.
4. Validate reduced findings against their cited source before relying on them.

## Stop conditions

Stop reduction when the root has enough attributable evidence to decide or when missing access must be reported honestly.

## Evidence

Keep citations, reduction criteria, and validated findings as part of the owning root run.

## Owners

`ps-how`, `ps-why`, `ps-blast-radius`, `ps-runtime-forensics`, `ps-trace-forensics`, `ps-skill-eval`, `ps-hillclimb`, `ps-visual-parity`, `ps-pr-babysit`.

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.
<!-- qs-progress:end -->
