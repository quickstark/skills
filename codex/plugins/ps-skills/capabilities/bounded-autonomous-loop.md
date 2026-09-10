# Bounded autonomous loop capability

## Purpose

Permit repeated measurement or monitoring inside one root without becoming an unbounded mode or creating another public run.

## Entry conditions

Use when the user requested an iterative outcome and the root has an explicit budget, stop predicate, cancellation path, and mutation boundary.

## Method

1. Record the budget and current predicate state before the first iteration.
2. Perform one bounded unit, validate its result, and update the remaining budget.
3. Optional helpers may run independent bounded units when available and inherit the parent model.
4. Check cancellation, authority, and stop conditions before every next unit.

## Stop conditions

Stop on the declared predicate, budget exhaustion, cancellation, failed required checks, or any need to exceed the root's authority.

## Evidence

Return the iteration ledger, stop reason, and final predicate evidence as part of the owning root run.

## Owners

`ps-hillclimb`, `ps-pr-babysit`.

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.
<!-- qs-progress:end -->
