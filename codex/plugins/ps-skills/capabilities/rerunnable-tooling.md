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
