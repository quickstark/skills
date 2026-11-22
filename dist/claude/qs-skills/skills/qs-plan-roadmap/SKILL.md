---
name: qs-plan-roadmap
description: "Sequence confirmed outcomes, decisions, and dependencies into a practical roadmap."
disable-model-invocation: true
---

# Plan a roadmap

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../../capabilities/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-plan-roadmap` and an `Outcome:` naming the owning package (qs-skills) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Organize confirmed outcomes into dependency-aware phases without inventing requirements or implementation detail.

## Behavior

- Read existing plans, issues, architecture, and delivery constraints.
- Separate outcome milestones from unresolved decision gates.
- Order work by real dependency, risk retirement, and independently verifiable value.
- Identify explicit prerequisites, parallelizable work, stop conditions, and deferred scope.
- Keep each phase bounded and give it observable completion evidence.
- Compare materially different sequences before settling the critical path, and make shared-state ownership explicit before parallelizing work.

Quick produces the critical path. Standard includes meaningful dependencies and risks. Deep evaluates alternative sequences and cross-team or release constraints. End with the roadmap only; do not start research, specification, or implementation automatically.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-plan-roadmap`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-plan-spec` / `/qs-plan-spec` / `/skill:qs-plan-spec`, `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
Recovery routes: `$qs-skills:qs-plan-spec` / `/qs-plan-spec` / `/skill:qs-plan-spec`, `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
