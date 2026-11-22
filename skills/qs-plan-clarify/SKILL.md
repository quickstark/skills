---
name: qs-plan-clarify
description: "Convert user prompt / probleminto a confirmed  scope, constraints, and decisions."
disable-model-invocation: true
---

# Clarify a plan in preparation for specification

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../_shared/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-plan-clarify` and an `Outcome:` naming the owning package (qs-skills) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Resolve the decisions that materially change scope, behavior, risk, or acceptance criteria in preparation for specification. Confirm the problem, users, scope, exclusions, constraints, acceptance evidence, decisions, and material exceptions. Identify only unresolved choices. Ask one focused question at a time when user input is genuinely required; stop when the answer is sufficient.

## Behavior

1. Inspect prior conversation, repository, issues, and documentation before asking questions.
2. Treat explicit user statements and established project decisions as settled unless you find conflicts.
3. Use available search tools to find relevant external context to inform your work
4. Identify only unresolved choices.
5. Ask one focused question at a time when user input is genuinely required; stop when the answer is sufficient.
6. Record the confirmed problem, users, scope, exclusions, constraints, acceptance evidence, decisions, and material exceptions.

Continue with safe, reversible, in-scope investigation when a reasonable assumption cannot change the requested outcome. If an unresolved choice would materially change scope, authority, behavior, or risk, name the evidence already gathered and request that decision instead of guessing or blocking on a low-value preference.

Use the internal domain-modeling capability when vocabulary ambiguity blocks agreement. Do not invoke old explore, interview, or domain commands. Do not continue into specification or implementation automatically.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-plan-clarify`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-plan-spec` / `/qs-plan-spec` / `/skill:qs-plan-spec`, `$qs-skills:qs-plan-roadmap` / `/qs-plan-roadmap` / `/skill:qs-plan-roadmap`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
Recovery routes: `$qs-skills:qs-plan-spec` / `/qs-plan-spec` / `/skill:qs-plan-spec`, `$qs-skills:qs-plan-roadmap` / `/qs-plan-roadmap` / `/skill:qs-plan-roadmap`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
