# Typescript discipline capability

## Purpose

Apply language-specific TypeScript practices that preserve inference, runtime correctness, and readable public types.

## Entry conditions

Use when the selected scope contains TypeScript source or declarations.

## Method

1. Prefer inferred local types and explicit boundary types.
2. Narrow unknown input before use and avoid assertions that erase evidence.
3. Model impossible states out of public unions when the surrounding design supports it.
4. Verify both type checking and the relevant runtime behavior.

## Stop conditions

Stop when the selected TypeScript boundary is correct, readable, and verified without unrelated type cleanup.

## Evidence

Record the affected type boundary and the type-check and runtime checks as part of the owning root run.

## Owners

`ps-help`, `ps-how`, `ps-why`, `ps-blast-radius`, `ps-runtime-forensics`, `ps-trace-forensics`, `ps-create-verification-skill`, `ps-maintain-verification-skill`, `ps-skill-eval`, `ps-hillclimb`, `ps-visual-parity`, `ps-pr-babysit`, `ps-worktree-cleanup`.

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.
<!-- qs-progress:end -->
