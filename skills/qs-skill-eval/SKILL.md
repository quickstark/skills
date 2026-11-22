---
name: qs-skill-eval
description: "Compare a skill or prompt variant with its control through blinded recorded trials."
disable-model-invocation: true
---

# Evaluate a skill variant

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../_shared/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-skill-eval` and an `Outcome:` naming the owning package (qs-advanced) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Run a declared, reproducible comparison within the selected evaluation fixtures and skill source.

## Required contract

Define the control and variant, task set, rubric, randomized or blinded assignment, retry policy, budget, and stopping rule before trials. Keep control and variant isolated and retain failed trials in the result.

Observable trial inputs, outputs, and checks are sufficient evidence. Transcript or run-history evidence is optional and may be used only through an available adapter after the user explicitly selects its source and scope; never scan unrelated workspaces or assume private history access.

Do not switch models secretly, claim performance without measurements, retry failures away, or change unrelated skill sources. Store only bounded evaluation fixtures and results.

Use natural task prompts and neutral labels and working paths; withhold the scoring rubric and preferred-variant identity from candidates. Score all variants on the same scale, with labels blinded to the evaluator. Keep model/variant identities and revealing source paths out of those labels; retain the true identities in the trial record. Record source revision or content hash, model/host configuration, sample count, sample definition, execution order, and actual inputs/outputs for every trial. Reject or explicitly disclose leaked identities, mismatched configurations, and unavailable controls; they cannot support a controlled superiority claim. The root inspects every completed output and records missing or failed candidates as gaps. Require repeated matched trials before claiming efficacy; separate instruction/token cost from task quality.

For execution-efficiency comparisons, freeze accepted outcome units independently of ticket count. Record all attributable coordinator, worker and failed-attempt usage without summing overlapping cumulative counters; tokens per accepted unit is unavailable when usage is missing or no unit passes. Keep loaded instruction tokens, provider/runtime totals, latency, financial cost and independently assessed quality separate. Report a touch rate only when observations establish both accepted units and units changed after acceptance. Count setup and retrieval overhead, preserve failures and reject fewer accepted outcomes as a win. Missing measurements retain the baseline for efficiency-only changes; independently verified correctness changes may proceed without a savings claim.

## Internal capabilities

Load only the relevant private references for the current question and evidence. They stay inside this root and never authorize another public invocation.

- [multi-candidate-exploration](../_shared/advanced/internal/multi-candidate-exploration.md)
- [decision-trail](../_shared/advanced/internal/decision-trail.md)
- [parallel-coverage](../_shared/advanced/internal/parallel-coverage.md)
- [typescript-discipline](../_shared/advanced/internal/typescript-discipline.md)
- [plain-writing](../_shared/advanced/internal/plain-writing.md)
- [rerunnable-tooling](../_shared/advanced/internal/rerunnable-tooling.md)
- [structural-enforcement](../_shared/advanced/internal/structural-enforcement.md)
- [context-discipline](../_shared/advanced/internal/context-discipline.md)
- [minimal-change](../_shared/advanced/internal/minimal-change.md)
- [concurrency-ownership](../_shared/advanced/internal/concurrency-ownership.md)
- [type-system-discipline](../_shared/advanced/internal/type-system-discipline.md)

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-skill-eval`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-specialists:qs-skill-write` / `/qs-skill-write` / `/skill:qs-skill-write`, `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
Recovery routes: `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`, `$qs-specialists:qs-skill-write` / `/qs-skill-write` / `/skill:qs-skill-write`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
