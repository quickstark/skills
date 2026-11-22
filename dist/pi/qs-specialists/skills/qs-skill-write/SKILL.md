---
name: qs-skill-write
description: "Create or improve one focused, testable agent skill."
disable-model-invocation: true
---

# Write an agent skill

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../../capabilities/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-skill-write` and an `Outcome:` naming the owning package (qs-specialists) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

This optional specialist defines one durable user intent, explicit invocation boundary, allowed tools and mutations, bounded workflow, failure behavior, and independently verifiable completion contract.

Inspect the host's current skill format and repository conventions. Keep instructions direct, eliminate overlapping commands and automatic public-skill chains, reuse shared policy instead of duplicating boilerplate, and add behavioral validation for routing and safety. Never claim installation or publication until verified.

Treat authoring as interface design: define one observable outcome, encode recurring lessons in structure or tests, make operations rerunnable, and compare a variant with its control when a prompt change makes a performance claim. Prefer plain language and cite primary technical standards where they govern behavior.

Keep universally required authority, outcome and failure rules inline. Put optional techniques behind a reference that names both its content and the exact condition for loading it; test each trigger and non-trigger branch. References stay inside the owning package and cannot authorize another root or mutation. Use [GLOSSARY.md](GLOSSARY.md) only when instruction terminology needs clarification.

Prefer a runtime lookup of readily discoverable configuration over copying facts that can become stale. Preserve non-obvious rationale and expensive-to-recover knowledge. Evaluate instruction changes against the actual model and task with a fixed control, loaded-token accounting and fresh responses; source brevity alone is not proof of efficiency. Record original source identity, immutable reviewed/adopted revisions and adaptations, including a renamed upstream successor, without rewriting historical provenance.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-skill-write`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-review-code` / `/qs-review-code` / `/skill:qs-review-code`, `$qs-specialists:qs-test-verify` / `/qs-test-verify` / `/skill:qs-test-verify`, `$qs-skills:qs-git-merge` / `/qs-git-merge` / `/skill:qs-git-merge`.
Recovery routes: `$qs-skills:qs-review-code` / `/qs-review-code` / `/skill:qs-review-code`, `$qs-specialists:qs-test-verify` / `/qs-test-verify` / `/skill:qs-test-verify`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
