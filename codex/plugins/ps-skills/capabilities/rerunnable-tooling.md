# Rerunnable tooling capability

## Purpose

Turn repeated evidence collection into a deterministic project-local command or fixture when that reduces future error.

## Entry conditions

Use when the same multi-step measurement must run more than once and the repository has an appropriate tooling location.

## Method

1. Define inputs, outputs, exit behavior, and cleanup before writing the tool.
2. Keep the tool inside the owning root's mutation scope.
3. Make repeated runs safe and ensure cleanup preserves evidence.
4. Execute the tool once through its real entrypoint before accepting it.

## Stop conditions

Stop when the workflow is reproducible or when creating tooling would cost more than the bounded task warrants.

## Evidence

Return the command, observed result, and cleanup behavior as part of the owning root run.

## Owners

`ps-create-verification-skill`, `ps-maintain-verification-skill`, `ps-skill-eval`, `ps-hillclimb`.

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.
<!-- qs-progress:end -->
