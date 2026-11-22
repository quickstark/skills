---
name: qs-worktree-cleanup
description: "Audit reclaimable worktrees and remove only explicitly confirmed exact targets."
disable-model-invocation: true
---

# Audit and clean worktrees

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../_shared/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-worktree-cleanup` and an `Outcome:` naming the owning package (qs-advanced) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Default scope is Git worktrees only. Begin with a read-only audit and do not infer deletion authority.

## Behavior

1. Enumerate worktrees through Git and resolve each candidate to an exact canonical path, branch, revision, dirty state, untracked state, and merged or unmerged status.
2. Exclude broad roots, unresolved paths, globs, the active worktree, dirty or unmerged worktrees, and any ambiguous target.
3. Present the exact eligible targets and consequences.
4. Require confirmation bound to that exact target list before removal.
5. Revalidate immediately before each action and report what was removed, skipped, and whether recovery remains possible.

Simulator data, application state, package caches, and build caches are separate secondary scopes. Each requires an explicit user request, its own read-only audit, and separate exact-target confirmation; worktree approval never authorizes them. Cancellation or timeout produces an honest non-complete result.

Check available host task ownership or explicitly selected user evidence: a clean merged worktree can still be active or pinned. Exclude active, pinned, or unresolved ownership from eligible targets. A path move, new untracked file or newly dirty state invalidates earlier confirmation until the exact safe target is re-established. Never turn a refused removal into force removal or a recursive-delete fallback.

## Internal capabilities

Load only the relevant private references for the current question and evidence. They stay inside this root and never authorize another public invocation.

- [decision-trail](../_shared/advanced/internal/decision-trail.md)
- [typescript-discipline](../_shared/advanced/internal/typescript-discipline.md)
- [plain-writing](../_shared/advanced/internal/plain-writing.md)
- [boundary-discipline](../_shared/advanced/internal/boundary-discipline.md)
- [minimal-change](../_shared/advanced/internal/minimal-change.md)
- [idempotent-operations](../_shared/advanced/internal/idempotent-operations.md)
- [outcome-oriented-execution](../_shared/advanced/internal/outcome-oriented-execution.md)
- [type-system-discipline](../_shared/advanced/internal/type-system-discipline.md)

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-worktree-cleanup`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`, `$qs-skills:qs-setup` / `/qs-setup` / `/skill:qs-setup`, `$qs-skills:qs-help` / `/qs-help` / `/skill:qs-help`.
Recovery routes: `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`, `$qs-skills:qs-help` / `/qs-help` / `/skill:qs-help`, `$qs-skills:qs-setup` / `/qs-setup` / `/skill:qs-setup`.
