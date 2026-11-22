---
name: qs-code-document
description: "Write concise documentation from verified project behavior and interfaces."
---

# Document verified behavior

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../_shared/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-code-document` and an `Outcome:` naming the owning package (qs-specialists) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

This optional specialist updates only the selected documentation scope. Inspect the implementation, configuration, commands, tests, and existing docs before writing.

Write for the reader's next decision: lead with the outcome, use established project vocabulary, remove repetition and vague filler, and distinguish verified behavior from examples or inference. When a technical rule depends on an external standard, cite the primary specification rather than a secondary summary.

Use the project's provenance records for origin claims, including multiple contributors and distinct reviewed/adopted revisions. Prefer a reference to discoverable configuration over duplicating facts that become stale. Distinguish verified current behavior from planned behavior. Prefer the shortest explanation that lets the intended reader act correctly. Validate commands and links when safe, preserve project terminology, and identify any behavior that could not be verified. Do not change product behavior or start release work automatically.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-code-document`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-review-code` / `/qs-review-code` / `/skill:qs-review-code`, `$qs-skills:qs-git-merge` / `/qs-git-merge` / `/skill:qs-git-merge`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
Recovery routes: `$qs-skills:qs-code-debug` / `/qs-code-debug` / `/skill:qs-code-debug`, `$qs-skills:qs-review-code` / `/qs-review-code` / `/skill:qs-review-code`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
