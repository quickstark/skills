# Multi candidate exploration capability

## Purpose

Compare genuinely different candidate approaches before committing to one implementation path.

## Entry conditions

Use when at least two plausible approaches remain, the decision criterion is named, and the owning root has a bounded exploration budget.

## Method

1. State the invariant every candidate must preserve.
2. Give each candidate one distinct hypothesis rather than cosmetic variation.
3. Evaluate each candidate through the same evidence path and record trade-offs.
4. Select, combine, or reject candidates from the recorded evidence.

Freeze common task grounding and the selection criterion before comparison. Inspect every completed candidate output and record dropouts as gaps; never select from partially written output or hide failed candidates.

## Stop conditions

Stop when one candidate satisfies the criterion, the budget is exhausted, or new input is required to distinguish the remaining options.

## Evidence

Keep a compact candidate matrix with hypothesis, tested evidence, trade-offs, and disposition as part of the owning root run.

## Owners

`qs-skill-eval`, `qs-hillclimb`, `qs-visual-parity`.

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.

Contribute observed partial work, remaining effort, uncertainty, and revision-bound evidence for the parent's stage and overall estimates. Waiting, elapsed time, token consumption, or a running process alone earns no progress. Flag invalidated evidence so the parent can lower estimates and reopen checks. Preserve valid evidence for resumption; do not count the same work twice or report an independent public percentage. Only the parent computes weighted progress and verifies 100% completion.
<!-- qs-progress:end -->
