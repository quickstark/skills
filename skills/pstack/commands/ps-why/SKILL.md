---
name: ps-why
description: "Explain why a behavior or design exists from attributable evidence."
disable-model-invocation: true
---

# Explain why a behavior exists

Investigate one rationale question without treating chronology or correlation as intent.

## Behavior

1. Define the behavior, design choice, and competing explanations.
2. Gather current code, tests, specifications, decisions, and optionally selected history.
3. Label facts, supported inferences, alternatives, and uncertainty separately.
4. Attribute every material rationale claim to its evidence.
5. State when intent cannot be proven and identify the smallest missing source.

Issue trackers, chat, version history, and observability are optional adapters, never mandatory providers. This command is read-only and does not redesign or repair the behavior.

## Completion report and next steps

This invocation has one root skill: `/ps-why`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-plan-clarify`, `/ps-how`, `/ps-blast-radius`. Failure routes: `/qs-plan-clarify`, `/qs-flow-handoff`, `/ps-how`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /ps-why
Outcome: Concise verified result.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-plan-clarify, $ps-skills:ps-how, $ps-skills:ps-blast-radius, $qs-skills:qs-flow-handoff); Claude uses `/qs-plan-clarify`, `/ps-how`, `/ps-blast-radius`, `/qs-flow-handoff`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
