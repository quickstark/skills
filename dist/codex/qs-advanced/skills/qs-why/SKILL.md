---
name: qs-why
description: "Explain why a behavior or design exists from attributable evidence."
---

# Explain why a behavior exists

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../../capabilities/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-why` and an `Outcome:` naming the owning package (qs-advanced) and prerequisite. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Investigate one rationale question without treating chronology or correlation as intent.

## Behavior

1. Define the behavior, design choice, and competing explanations.
2. Gather current code, tests, specifications, decisions, and optionally selected history.
3. Label facts, supported inferences, alternatives, and uncertainty separately.
4. Attribute every material rationale claim to its evidence.
5. State when intent cannot be proven and identify the smallest missing source.

Issue trackers, chat, version history, and observability are optional adapters, never mandatory providers. This command is read-only and does not redesign or repair the behavior.

## Internal capabilities

Load only the relevant private references for the current question and evidence. They stay inside this root and never authorize another public invocation.

- [parallel-coverage](../../capabilities/advanced/internal/parallel-coverage.md)
- [typescript-discipline](../../capabilities/advanced/internal/typescript-discipline.md)
- [plain-writing](../../capabilities/advanced/internal/plain-writing.md)
- [context-discipline](../../capabilities/advanced/internal/context-discipline.md)
- [concurrency-ownership](../../capabilities/advanced/internal/concurrency-ownership.md)
- [type-system-discipline](../../capabilities/advanced/internal/type-system-discipline.md)

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-why`, and `Outcome:`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`, `$qs-advanced:qs-how` / `/qs-how` / `/skill:qs-how`, `$qs-advanced:qs-blast-radius` / `/qs-blast-radius` / `/skill:qs-blast-radius`.
Recovery routes: `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`, `$qs-advanced:qs-how` / `/qs-how` / `/skill:qs-how`.
