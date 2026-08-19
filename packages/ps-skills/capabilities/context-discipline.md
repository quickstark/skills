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
