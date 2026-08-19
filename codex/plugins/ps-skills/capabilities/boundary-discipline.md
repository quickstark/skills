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
