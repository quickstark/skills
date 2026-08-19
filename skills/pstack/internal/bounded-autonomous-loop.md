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
