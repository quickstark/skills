---
name: ps-help
description: "Choose the right explicit PS or QS workflow without starting it."
---

# Choose a PS or QS workflow

Act as a read-only router. Identify the user's primary desired outcome, distinguish it from intermediate techniques, and recommend one public root with concise reasons and alternatives.

## Behavior

1. Resolve the requested outcome, evidence needs, mutation authority, and stopping point.
2. Match that outcome against the registered PS and QS command catalog.
3. Recommend one preferred command and at most two alternatives using exact package literals.
4. State material assumptions or missing adapters.

Do not execute the selected workflow, mutate files, or automatically invoke another public skill.

## Completion report and next steps

This invocation has one root skill: `/ps-help`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/ps-how`, `/ps-why`, `/qs-plan-clarify`. Failure routes: `/qs-plan-clarify`, `/qs-flow-handoff`, `/ps-how`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /ps-help
Outcome: Concise verified result.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($ps-skills:ps-how, $ps-skills:ps-why, $qs-skills:qs-plan-clarify, $qs-skills:qs-flow-handoff); Claude uses `/ps-how`, `/ps-why`, `/qs-plan-clarify`, `/qs-flow-handoff`; Pi uses `/skill:ps-how`, `/skill:ps-why`, `/skill:qs-plan-clarify`, `/skill:qs-flow-handoff`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
