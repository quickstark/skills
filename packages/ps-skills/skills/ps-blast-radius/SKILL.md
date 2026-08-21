---
name: ps-blast-radius
description: "Map the impact of one proposed change across callers, contracts, data, tests, and operations."
disable-model-invocation: true
---

# Map a proposed change's blast radius

Analyze one proposed change without implementing it.

## Behavior

1. Resolve the exact symbol, contract, schema, behavior, or boundary being changed.
2. Trace direct and indirect callers, stored data, public interfaces, tests, deployment, and operational dependencies.
3. Rank evidence as executable proof, static proof, documented contract, or inference.
4. Prove at least one critical safety claim directly when a stable executable seam exists.
5. Label untested or unresolved claims as unproven and describe the missing proof.

Keep exploration bounded to the selected change. Do not claim complete proof from search results alone, and do not implement or repair affected code.

## Completion report and next steps

This invocation has one root skill: `/ps-blast-radius`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-plan-spec`, `/qs-review-code`, `/qs-flow-handoff`. Failure routes: `/qs-plan-clarify`, `/qs-flow-handoff`, `/ps-how`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /ps-blast-radius
Outcome: Concise verified result.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-plan-spec, $qs-skills:qs-review-code, $qs-skills:qs-flow-handoff, $qs-skills:qs-plan-clarify, $ps-skills:ps-how); Claude uses `/qs-plan-spec`, `/qs-review-code`, `/qs-flow-handoff`, `/qs-plan-clarify`, `/ps-how`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
