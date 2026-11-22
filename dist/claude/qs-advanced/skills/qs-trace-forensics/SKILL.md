---
name: qs-trace-forensics
description: "Diagnose one supplied profiling or trace artifact without changing product behavior."
disable-model-invocation: true
---

# Diagnose a supplied trace

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../../capabilities/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-trace-forensics` and an `Outcome:` naming the owning package (qs-advanced) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Analyze one bounded trace, profile, recording, or diagnostic artifact as a read-only root.

## Behavior

1. Verify artifact identity, capture context, tool/version, time range, and expected baseline.
2. Redact or omit secrets, user payloads, and unsafe paths before reporting.
3. Identify dominant spans, stacks, waits, allocations, or event sequences.
4. Test competing hypotheses against the artifact and corroborating code.
5. Report the supported diagnosis, residual uncertainty, and reproducible evidence.

Do not repair product behavior or add durable instrumentation. If either is required, return `continuation-required` with a separate debug prompt.

Keep the supplied artifact immutable and record its content hash plus its capture/build/source identity when available. Resolve source symbols against the matching revision; mark a mismatched or unknown mapping as uncertain. Preserve conflicting spans and sample methodology when reducing evidence. A single supplied trace does not establish a before/after change; request the missing paired artifact when that claim requires one. This root does not authorize new live collection.

## Internal capabilities

Load only the relevant private references for the current question and evidence. They stay inside this root and never authorize another public invocation.

- [typescript-discipline](../../capabilities/advanced/internal/typescript-discipline.md)
- [plain-writing](../../capabilities/advanced/internal/plain-writing.md)
- [context-discipline](../../capabilities/advanced/internal/context-discipline.md)
- [type-system-discipline](../../capabilities/advanced/internal/type-system-discipline.md)

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-trace-forensics`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-code-debug` / `/qs-code-debug` / `/skill:qs-code-debug`, `$qs-advanced:qs-runtime-forensics` / `/qs-runtime-forensics` / `/skill:qs-runtime-forensics`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
Recovery routes: `$qs-skills:qs-code-debug` / `/qs-code-debug` / `/skill:qs-code-debug`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`, `$qs-advanced:qs-runtime-forensics` / `/qs-runtime-forensics` / `/skill:qs-runtime-forensics`.
