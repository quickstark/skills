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

## Stop conditions

Stop when one candidate satisfies the criterion, the budget is exhausted, or new input is required to distinguish the remaining options.

## Evidence

Keep a compact candidate matrix with hypothesis, tested evidence, trade-offs, and disposition as part of the owning root run.

## Owners

`ps-skill-eval`, `ps-hillclimb`, `ps-visual-parity`.
