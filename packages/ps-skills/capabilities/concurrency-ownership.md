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
