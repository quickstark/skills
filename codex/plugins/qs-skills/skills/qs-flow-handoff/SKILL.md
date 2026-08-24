---
name: qs-flow-handoff
description: "Preserve verified state and ranked next actions for another operator or invocation."
---

# Create a handoff

Capture only verified current state: objective, completed work, governing decisions, changed and unrelated dirty files, checks, branch/commit/PR state, blockers, risks, and the exact remaining boundary.

Do not claim a receiving workflow has run. Provide one preferred copy-ready continuation and two concise alternatives with the evidence needed to resume safely.

Keep the handoff concise enough to resume without rereading the full session. Never include credentials or private values.

Include rerunnable commands, exact artifact identities, and the last proven boundary. Distinguish completed evidence from planned actions so resumption never depends on hidden transcript context.

## Completion report and next steps

This invocation has one root skill: `/qs-flow-handoff`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-help`, `/qs-code-build`, `/qs-plan-clarify`. Failure routes: `/qs-help`, `/qs-code-build`, `/qs-plan-clarify`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-flow-handoff
Outcome: Concise verified result.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-help, $qs-skills:qs-code-build, $qs-skills:qs-plan-clarify); Claude uses `/qs-help`, `/qs-code-build`, `/qs-plan-clarify`; Pi uses `/skill:qs-help`, `/skill:qs-code-build`, `/skill:qs-plan-clarify`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
