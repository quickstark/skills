---
name: qs-plan-clarify
description: "Turn ambiguity into a confirmed problem, scope, constraints, and decisions."
---

# Clarify a plan

Resolve the decisions that materially change scope, behavior, risk, or acceptance criteria. Exploration and focused interviewing are techniques inside this one run.

## Behavior

1. Inspect conversation, repository, issue, and documentation evidence before asking questions.
2. Treat explicit user statements and established project decisions as settled unless evidence conflicts.
3. Identify only unresolved material choices.
4. Ask one focused question at a time when user input is genuinely required; stop when the answer is sufficient.
5. Record the confirmed problem, users, scope, exclusions, constraints, acceptance evidence, decisions, and material exceptions.

Use the internal domain-modeling capability when vocabulary ambiguity blocks agreement. Do not invoke old explore, interview, or domain commands. Do not continue into specification or implementation automatically.

## Completion report and next steps

This invocation has one root skill: `/qs-plan-clarify`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. Every result emits three ranked copy-ready prompts: one opinionated preferred prompt followed by two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

The default ranked continuations are `/qs-plan-spec`, `/qs-plan-roadmap`, `/qs-flow-handoff`. A failed result instead ranks `/qs-plan-spec`, `/qs-plan-roadmap`, `/qs-flow-handoff`. Tailor each prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, one preferred prompt, and two alternatives. Full adds the evidence trail but never extra prompts. Omit empty sections and routine successful detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-plan-clarify
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Present prompts in normalized rank order. Label the first `Preferred next prompt:` and the remaining two `Alternative next prompt:`. Put each complete prompt in its own fenced `text` block beginning with its exact Codex skill literal ($qs-skills:qs-plan-spec, $qs-skills:qs-plan-roadmap, $qs-skills:qs-flow-handoff); Claude uses `/qs-plan-spec`, `/qs-plan-roadmap`, `/qs-flow-handoff`. The fence info string must be exactly `text` so the chat renders it as Plain text; never use `markdown`, `bash`, `json`, or another language. Keep every prompt concise and carry forward only the outcome plus the single highest-value evidence item. Put heuristic model/thinking guidance outside each fence in a muted blockquote. Never change the active model or reasoning setting.
