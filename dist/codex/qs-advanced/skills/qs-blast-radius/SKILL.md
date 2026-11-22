---
name: qs-blast-radius
description: "Map the impact of one proposed change across callers, contracts, data, tests, and operations."
---

# Map a proposed change's blast radius

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../../capabilities/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-blast-radius` and an `Outcome:` naming the owning package (qs-advanced) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Analyze one proposed change without implementing it.

## Behavior

1. Resolve the exact symbol, contract, schema, behavior, or boundary being changed.
2. Trace direct and indirect callers, stored data, public interfaces, tests, deployment, and operational dependencies.
3. Rank evidence as executable proof, static proof, documented contract, or inference.
4. Prove at least one critical safety claim directly when a stable executable seam exists.
5. Label untested or unresolved claims as unproven and describe the missing proof.

Keep exploration bounded to the selected change. Do not claim complete proof from search results alone, and do not implement or repair affected code.

## Internal capabilities

Load only the relevant private references for the current question and evidence. They stay inside this root and never authorize another public invocation.

- [parallel-coverage](../../capabilities/advanced/internal/parallel-coverage.md)
- [typescript-discipline](../../capabilities/advanced/internal/typescript-discipline.md)
- [plain-writing](../../capabilities/advanced/internal/plain-writing.md)
- [context-discipline](../../capabilities/advanced/internal/context-discipline.md)
- [concurrency-ownership](../../capabilities/advanced/internal/concurrency-ownership.md)
- [type-system-discipline](../../capabilities/advanced/internal/type-system-discipline.md)

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-blast-radius`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-plan-spec` / `/qs-plan-spec` / `/skill:qs-plan-spec`, `$qs-skills:qs-review-code` / `/qs-review-code` / `/skill:qs-review-code`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
Recovery routes: `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`, `$qs-advanced:qs-how` / `/qs-how` / `/skill:qs-how`.
