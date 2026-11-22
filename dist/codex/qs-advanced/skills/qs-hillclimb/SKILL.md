---
name: qs-hillclimb
description: "Improve one declared objective through experiments."
---

# Hillclimb one metric

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../../capabilities/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-hillclimb` and an `Outcome:` naming the owning package (qs-advanced) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Optimize the user-specified scope. This command never commits, pushes, opens a pull request, merges, deploys, or releases. The goal is to improve an aspect of the system and prepare that for /qs-plan-spec or /qs-review-code.

## Required contract

Before editing, record the metric, credible baseline, target, experiment budget, measurement command, accepted-change rule, rollback criterion, and noise handling. If the baseline is missing or unstable, stop before claiming improvement.

For each bounded experiment, record the hypothesis, exact change, measurement, comparison, and keep/revert decision. Revert regressions safely, preserve failed or noisy trials, and stop at the target, exhausted budget, invalid measurement, or safety boundary. Never optimize an undeclared proxy or unrelated code.

Choose a representative workload that reproduces the problem. Before editing, prove the harness distinguishes contrasting workloads and record a green regression gate. Freeze the measurement implementation, settings, sample definition/count, execution order and environment; bind trial results to the exact source revision or content hash. A changed harness invalidates prior comparisons and requires a new baseline. Accept a change only when improvement exceeds declared noise and the regression gate stays green; a faster regression is a rejection. After repeated failed fixes, revisit the shared causal premise and collect discriminating evidence before adding more machinery. Do not impose an arbitrary minimum iteration count when the declared predicate is already met.

## Internal capabilities

Load only the relevant private references for the current question and evidence. They stay inside this root and never authorize another public invocation.

- [multi-candidate-exploration](../../capabilities/advanced/internal/multi-candidate-exploration.md)
- [decision-trail](../../capabilities/advanced/internal/decision-trail.md)
- [typescript-discipline](../../capabilities/advanced/internal/typescript-discipline.md)
- [plain-writing](../../capabilities/advanced/internal/plain-writing.md)
- [rerunnable-tooling](../../capabilities/advanced/internal/rerunnable-tooling.md)
- [experience-first](../../capabilities/advanced/internal/experience-first.md)
- [context-discipline](../../capabilities/advanced/internal/context-discipline.md)
- [minimal-change](../../capabilities/advanced/internal/minimal-change.md)
- [outcome-oriented-execution](../../capabilities/advanced/internal/outcome-oriented-execution.md)
- [concurrency-ownership](../../capabilities/advanced/internal/concurrency-ownership.md)
- [type-system-discipline](../../capabilities/advanced/internal/type-system-discipline.md)
- [bounded-autonomous-loop](../../capabilities/advanced/internal/bounded-autonomous-loop.md)

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-hillclimb`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-review-code` / `/qs-review-code` / `/skill:qs-review-code`, `$qs-specialists:qs-test-verify` / `/qs-test-verify` / `/skill:qs-test-verify`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
Recovery routes: `$qs-skills:qs-code-debug` / `/qs-code-debug` / `/skill:qs-code-debug`, `$qs-specialists:qs-test-verify` / `/qs-test-verify` / `/skill:qs-test-verify`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
