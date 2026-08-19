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
