---
name: qs-runtime-forensics
description: "Diagnose one live runtime symptom from actual measurements without repairing it."
---

# Diagnose a live runtime symptom

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../../capabilities/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-runtime-forensics` and an `Outcome:` naming the owning package (qs-advanced) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Own diagnosis only. Temporary, non-product evidence artifacts and existing instrumentation are allowed; tracked product changes are not.

## Behavior

1. Record the symptom, environment, time window, expected baseline, and access boundaries.
2. Capture bounded measurements with secrets and sensitive payloads redacted.
3. Form competing hypotheses and choose observations that can falsify them.
4. Compare measurements with the baseline and isolate the causal mechanism.
5. Stop with a diagnosis, uncertainty, and reproducible evidence.

If durable instrumentation or a product repair is needed, return `continuation-required` before changing tracked product source. Never include sensitive artifact contents, private paths, or credential values in the chat result.

Bind measurements to the observed build/source revision, capture identity, environment and method (sample count, what one sample means, and execution order). If source identity is unavailable, report that uncertainty rather than assigning a guessed revision. Use paired captures or a discriminating observation when a causal claim depends on a comparison; distinguish correlation from a supported mechanism. Temporary collection must remain inside the authorized live target and time window.

## Internal capabilities

Load only the relevant private references for the current question and evidence. They stay inside this root and never authorize another public invocation.

- [typescript-discipline](../../capabilities/advanced/internal/typescript-discipline.md)
- [plain-writing](../../capabilities/advanced/internal/plain-writing.md)
- [context-discipline](../../capabilities/advanced/internal/context-discipline.md)
- [type-system-discipline](../../capabilities/advanced/internal/type-system-discipline.md)

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-runtime-forensics`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-code-debug` / `/qs-code-debug` / `/skill:qs-code-debug`, `$qs-advanced:qs-trace-forensics` / `/qs-trace-forensics` / `/skill:qs-trace-forensics`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
Recovery routes: `$qs-skills:qs-code-debug` / `/qs-code-debug` / `/skill:qs-code-debug`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`, `$qs-advanced:qs-trace-forensics` / `/qs-trace-forensics` / `/skill:qs-trace-forensics`.
