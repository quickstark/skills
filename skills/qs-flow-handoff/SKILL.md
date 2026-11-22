---
name: qs-flow-handoff
description: "Preserve verified state and ranked next actions for another operator or invocation."
disable-model-invocation: true
---

# Create a handoff

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../_shared/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-flow-handoff` and an `Outcome:` naming the owning package (qs-skills) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Capture only verified current state: objective, completed work, governing decisions, changed and unrelated dirty files, checks, branch/commit/PR state, blockers, risks, and the exact remaining boundary.

Do not claim a receiving workflow has run. Provide at most one copy-ready continuation for the next verified actionable boundary, with the evidence needed to resume safely. Preserve current authority, cancellations, pending work, and revision-bound checks; a receiving session must revalidate changed evidence before continuing.

Keep the handoff concise enough to resume without rereading the full session. Never include credentials or private values.

Include rerunnable commands, exact artifact identities, and the last proven boundary. Distinguish completed evidence from planned actions so resumption never depends on hidden transcript context.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-flow-handoff`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-help` / `/qs-help` / `/skill:qs-help`, `$qs-skills:qs-code-build` / `/qs-code-build` / `/skill:qs-code-build`, `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`.
Recovery routes: `$qs-skills:qs-help` / `/qs-help` / `/skill:qs-help`, `$qs-skills:qs-code-build` / `/qs-code-build` / `/skill:qs-code-build`, `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`.
