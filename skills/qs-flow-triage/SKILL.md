---
name: qs-flow-triage
description: "Assess incoming work and record one bounded recommended route."
disable-model-invocation: true
---

# Triage incoming work

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../_shared/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-flow-triage` and an `Outcome:` naming the owning package (qs-skills) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Inspect the issue, duplicates, project evidence, tracker conventions, impact, urgency, reproducibility, dependencies, and missing acceptance evidence.

Record one disposition and one recommended root workflow. Update tracker state only when authorized. Never invoke the routed workflow automatically, never claim it ran, and do not turn triage into implementation.

Quick handles one clear item. Standard handles a bounded batch with normal evidence. Deep may reconcile wider dependencies and duplicates but still produces one route per item and no public-skill hops.

When an item needs an implementation brief, use [AGENT-BRIEF.md](AGENT-BRIEF.md) to draft its bounded acceptance contract. For a potentially rejected enhancement, use [OUT-OF-SCOPE.md](OUT-OF-SCOPE.md) to inspect relevant prior decisions. Neither reference authorizes posting, labeling, closing, deleting records or creating tracker work; apply changes only within the user's selected mutation scope. Retain prior decisions and distinguish supersession from deletion.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-flow-triage`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-plan-roadmap` / `/qs-plan-roadmap` / `/skill:qs-plan-roadmap`, `$qs-skills:qs-code-debug` / `/qs-code-debug` / `/skill:qs-code-debug`, `$qs-skills:qs-code-build` / `/qs-code-build` / `/skill:qs-code-build`.
Recovery routes: `$qs-skills:qs-code-debug` / `/qs-code-debug` / `/skill:qs-code-debug`, `$qs-skills:qs-plan-roadmap` / `/qs-plan-roadmap` / `/skill:qs-plan-roadmap`, `$qs-skills:qs-code-build` / `/qs-code-build` / `/skill:qs-code-build`.
