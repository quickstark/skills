---
name: qs-help
description: "Choose one bounded QuickStark workflow from the v3 core or optional specialists."
disable-model-invocation: true
---

# QuickStark help

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../../capabilities/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-help` and an `Outcome:` naming the owning package (qs-skills) and prerequisite. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Inspect the request and available project evidence, then recommend the single best root command. Do not execute it automatically.

## Core commands

| Order | Command | Use when |
| ---: | --- | --- |
| 10 | `/qs-help` | The correct workflow is unclear. |
| 20 | `/qs-setup` | A project needs QuickStark configuration or verification. |
| 30 | `/qs-plan-clarify` | Ambiguity, scope, constraints, or decisions remain. |
| 40 | `/qs-plan-roadmap` | Confirmed outcomes need sequencing across phases. |
| 50 | `/qs-plan-spec` | Confirmed work needs an actionable spec or dependency-aware tickets. |
| 60 | `/qs-code-build` | A scoped change is ready to implement. |
| 70 | `/qs-code-debug` | A reproducible defect needs diagnosis and repair. |
| 80 | `/qs-review-code` | Code or a change needs review, scoped improvement, or refactoring. |
| 90 | `/qs-git-merge` | Selected changes need safe Git integration or publication. |
| 100 | `/qs-deploy-release` | A documented release or deployment is explicitly requested. |
| 110 | `/qs-flow-triage` | Incoming work needs one bounded route. |
| 120 | `/qs-flow-handoff` | Verified state must be transferred. |

## Optional specialists

`/qs-plan-research`, `/qs-design-prototype`, `/qs-code-document`, `/qs-test-author`, `/qs-test-verify`, `/qs-learn-teach`, `/qs-skill-write`, and `/qs-deploy-prompt` are independently installable in `qs-specialists`. Core workflows do not require them.

## Routing rules

- Prefer the command whose primary outcome matches the request, not an intermediate technique.
- Refactoring belongs to `/qs-review-code` with `action=refactor` and a narrow selected target. Whole-codebase refactoring starts with a bounded read-only review.
- Adding or improving tests for already-established behavior belongs to `/qs-test-author`; executing and reporting a read-only verification matrix belongs to `/qs-test-verify`.
- Test-driven development is internal to `/qs-code-build`, not a command.
- Domain modeling, module decomposition, and ticket decomposition are internal planning or implementation capabilities.
- A specification whose tickets carry `Blocked by` edges, to be implemented ticket by ticket with concurrent helpers, belongs to `/qs-code-build` with `mode=graph`. Substantial work that needs explicit per-leaf acceptance gates and ledgers belongs to `/qs-unlazy` in the optional `qs-execution` package. Delegation is an internal capability, not a command.
- Choose one primary route from the registered public catalog; primary Help routing is not limited to another workflow's continuation list. Use the registry's exact literal for the active host.
- Verify that the selected command is actually available before emitting its one copy-ready prompt. Catalog membership alone does not prove installation. For an unavailable optional capability, report the specific installation prerequisite; do not invent an executable prompt or install it automatically.
- Keep discovery read-only. Describe optional capabilities from metadata without loading or invoking their public bodies. Preserve distinct prompt-authoring and visual-parity outcomes when they are available.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-help`, and `Outcome:`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`, `$qs-skills:qs-flow-triage` / `/qs-flow-triage` / `/skill:qs-flow-triage`, `$qs-skills:qs-setup` / `/qs-setup` / `/skill:qs-setup`.
Recovery routes: `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`, `$qs-skills:qs-flow-triage` / `/qs-flow-triage` / `/skill:qs-flow-triage`, `$qs-skills:qs-setup` / `/qs-setup` / `/skill:qs-setup`.
For primary Help routing, read [ROUTING.md](ROUTING.md). A verified available destination may be outside the ordinary routes. An unavailable destination produces Input required with the exact prerequisite and no executable prompt.
