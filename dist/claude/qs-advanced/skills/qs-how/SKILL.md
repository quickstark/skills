---
name: qs-how
description: "Explain how a selected subsystem works from code and observed interfaces."
disable-model-invocation: true
---

# Explain how a subsystem works

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../../capabilities/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-how` and an `Outcome:` naming the owning package (qs-advanced) and prerequisite. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Produce a read-only, evidence-based walkthrough of one selected subsystem.

## Behavior

1. Bound the subsystem and the caller-visible question.
2. Trace representative inputs through entry points, state transitions, boundaries, and outputs.
3. Distinguish directly observed facts from inferences and unresolved uncertainty.
4. Cite files, interfaces, tests, or runtime evidence near each material claim.
5. Explain failure modes and operational effects only when supported.

Use optional adapters only when available and selected. Missing history, issue, chat, or observability providers reduce the evidence available; they do not justify invention. Do not implement changes.

## Internal capabilities

Load only the relevant private references for the current question and evidence. They stay inside this root and never authorize another public invocation.

- [parallel-coverage](../../capabilities/advanced/internal/parallel-coverage.md)
- [typescript-discipline](../../capabilities/advanced/internal/typescript-discipline.md)
- [plain-writing](../../capabilities/advanced/internal/plain-writing.md)
- [context-discipline](../../capabilities/advanced/internal/context-discipline.md)
- [concurrency-ownership](../../capabilities/advanced/internal/concurrency-ownership.md)
- [type-system-discipline](../../capabilities/advanced/internal/type-system-discipline.md)

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-how`, and `Outcome:`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-advanced:qs-blast-radius` / `/qs-blast-radius` / `/skill:qs-blast-radius`, `$qs-skills:qs-plan-spec` / `/qs-plan-spec` / `/skill:qs-plan-spec`, `$qs-advanced:qs-why` / `/qs-why` / `/skill:qs-why`.
Recovery routes: `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`, `$qs-advanced:qs-why` / `/qs-why` / `/skill:qs-why`.
