# Structural enforcement capability

## Purpose

Encode durable workflow requirements in schemas, tests, or generated structure instead of relying on reminders.

## Entry conditions

Use when a verified lesson is stable, repeatable, and enforceable at a repository boundary.

## Method

1. Name the failure the structure must prevent.
2. Choose the smallest enforceable seam: schema, validation, fixture, generator, or test.
3. Demonstrate that the seam rejects the known violation.
4. Keep policy text aligned with the executable constraint.

## Stop conditions

Stop when the known violation fails deterministically or when the rule remains too contextual for safe automation.

## Evidence

Record the protected invariant and its failing and passing examples as part of the owning root run.

## Owners

`ps-create-verification-skill`, `ps-maintain-verification-skill`, `ps-skill-eval`.
