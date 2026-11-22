---
name: qs-plan-spec
description: "Produce an actionable specification, dependency-aware tickets, or both."
disable-model-invocation: true
---

# Write specs and tickets

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../_shared/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-plan-spec` and an `Outcome:` naming the owning package (qs-skills) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Turn confirmed requirements into an actionable graph-friendly specifications and dependency-aware tickets. Do not reopen settled product decisions unless project evidence exposes a contradiction.

## Internal capabilities

Load the relevant non-command references from `skills/_shared/core/` in the canonical repository or `capabilities/` in a packaged plugin:

- Domain modeling when precise vocabulary changes requirements or interfaces.
- Module decomposition when ownership, interfaces, or test seams need design.
- Ticket decomposition when explicitly requested, required by the configured tracker, or needed for safely assignable work.
- Delegation when independent current-state evidence surfaces can be explored in parallel; exploration helpers stay read-only.

Capability use remains part of this root run and produces no separate skill report.

## Specification contents

- Problem, scope, exclusions, and governing decisions.
- Current-state evidence and constraints.
- Required behavior, interfaces, data, failure handling, and migration impact.
- Implementation boundaries and dependency order.
- Verification evidence for every acceptance criterion.
- Security, operational, compatibility, and rollout concerns when relevant.
- Open questions only when they truly block implementation.

Where architecture is unsettled, compare at least two viable boundaries against domain responsibilities, caller migration, failure isolation, and test seams. Prefer a design whose safety properties can be enforced structurally and whose legacy interfaces can be removed only after callers migrate.

Specification-only requests do not create tickets. When tickets are requested, create dependency-ordered, independently verifiable slices in the same run. Give every ticket one outcome, explicit scope and exclusions, acceptance evidence, and explicit `Blocked by` edges. Explain the prerequisite outcome or artifact consumed by each edge; scheduling preference alone does not block a ticket. Include starting source pointers and revision or content identity for a bounded worker brief, allowing justified discovery without expanding writes. Size each ticket to fit one fresh context window so it can be implemented by a single helper. The resulting tickets form a task graph whose frontier is every open ticket with no unfinished blockers; `qs-code-build mode=graph` can walk it later. Do not start implementation automatically.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-plan-spec`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-code-build` / `/qs-code-build` / `/skill:qs-code-build`, `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
Recovery routes: `$qs-skills:qs-code-build` / `/qs-code-build` / `/skill:qs-code-build`, `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
