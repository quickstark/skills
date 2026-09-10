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

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.
<!-- qs-progress:end -->
