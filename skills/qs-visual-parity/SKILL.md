---
name: qs-visual-parity
description: "Converge a selected implementation toward a verified immutable visual baseline."
disable-model-invocation: true
---

# Converge toward visual parity

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../_shared/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-visual-parity` and an `Outcome:` naming the owning package (qs-advanced) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Modify only the selected implementation. The supplied baseline is immutable.

## Required contract

Record baseline identity and hash, capture environment, comparison metric, iteration budget, and a repository-declared or user-approved tolerance. If no tolerance exists, return `input-required` before implementation edits; never invent a universal threshold.

Reuse an existing browser or screenshot harness through the verification-driver interface when available. Keep assets, fonts, viewport, scale, rendering engine, and environment stable. After each iteration, record the metric, declared tolerance, measured residual, and change. Never crop, rescale, regenerate, replace, or otherwise alter the baseline. Complete only when the measured residual is within tolerance; subjective inspection alone is not exact parity.

Declare the UI state and viewport coverage before implementation. Freeze the comparison implementation and settings with the baseline, metric and approved tolerance. Confirm the comparator detects a known visual mismatch before relying on it. Never relax the tolerance to make a result pass. If the harness or renderer changes, invalidate prior comparisons and restore the agreed capture/comparison contract before continuing; do not alter the baseline. Migrate shared primitives before dependent components when required by the selected change. Record source revision or content hash and measured residual for every required state/viewport; missing coverage cannot count as parity.

For decoded RGBA captures, the optional [private comparison helper](../_shared/advanced/tools/visual-parity.mjs) freezes coverage/environment/baseline hashes and measures a declared byte-difference fraction. Use it only when that metric and tolerance match the agreed contract; do not replace a project comparator or infer approval from constructing a contract. Keep the original contract separately from editable captures.

## Internal capabilities

Load only the relevant private references for the current question and evidence. They stay inside this root and never authorize another public invocation.

- [multi-candidate-exploration](../_shared/advanced/internal/multi-candidate-exploration.md)
- [decision-trail](../_shared/advanced/internal/decision-trail.md)
- [typescript-discipline](../_shared/advanced/internal/typescript-discipline.md)
- [plain-writing](../_shared/advanced/internal/plain-writing.md)
- [experience-first](../_shared/advanced/internal/experience-first.md)
- [context-discipline](../_shared/advanced/internal/context-discipline.md)
- [minimal-change](../_shared/advanced/internal/minimal-change.md)
- [type-system-discipline](../_shared/advanced/internal/type-system-discipline.md)

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-visual-parity`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-review-code` / `/qs-review-code` / `/skill:qs-review-code`, `$qs-specialists:qs-test-verify` / `/qs-test-verify` / `/skill:qs-test-verify`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
Recovery routes: `$qs-skills:qs-code-debug` / `/qs-code-debug` / `/skill:qs-code-debug`, `$qs-specialists:qs-test-verify` / `/qs-test-verify` / `/skill:qs-test-verify`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
