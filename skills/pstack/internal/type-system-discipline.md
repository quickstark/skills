# Type system discipline capability

## Purpose

Use the project's type system to express domain constraints and prevent invalid states at module boundaries.

## Entry conditions

Use when the selected code-aware root inspects or changes a typed interface, data model, or call boundary.

## Method

1. Identify the invariant the type boundary should express.
2. Distinguish trusted internal values from parsed external input.
3. Prefer precise domain types over broad primitives when they reduce caller ambiguity.
4. Verify affected callers and runtime validation as well as static checks.

## Stop conditions

Stop when the selected invariant is represented and callers are verified without redesigning unrelated types.

## Evidence

Record the invariant, affected boundary, callers, and checks as part of the owning root run.

## Owners

`ps-how`, `ps-why`, `ps-blast-radius`, `ps-runtime-forensics`, `ps-trace-forensics`, `ps-create-verification-skill`, `ps-maintain-verification-skill`, `ps-skill-eval`, `ps-hillclimb`, `ps-visual-parity`, `ps-pr-babysit`, `ps-worktree-cleanup`.
