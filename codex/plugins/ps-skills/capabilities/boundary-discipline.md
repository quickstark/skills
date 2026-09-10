# Boundary discipline capability

## Purpose

Keep reads, writes, authority, and external effects inside the selected root's declared boundary.

## Entry conditions

Use when a workflow can write verification assets, change an implementation, affect a pull request, or remove local state.

## Method

1. Resolve the exact owned scope before mutation.
2. Distinguish always-safe inspection from actions requiring explicit authority.
3. Reject unresolved paths, inferred external targets, and authority borrowed from another workflow.
4. Recheck the boundary after each material change.

## Stop conditions

Stop before any action whose target, ownership, reversibility, or authority is unresolved.

## Evidence

Record the resolved scope, authority source, and boundary checks as part of the owning root run.

## Owners

`ps-create-verification-skill`, `ps-maintain-verification-skill`, `ps-pr-babysit`, `ps-worktree-cleanup`.

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.
<!-- qs-progress:end -->
