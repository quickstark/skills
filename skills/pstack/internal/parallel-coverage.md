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
