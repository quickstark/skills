---
name: qs-plan-research
description: "Answer one bounded question using reliable, attributable evidence."
---

# Research a question

This optional specialist answers one explicit question. Establish the decision the research must support, source freshness needs, and evidence standard before searching.

Prefer primary sources, distinguish observation from inference, record material uncertainty and disagreement, and stop when the requested decision has sufficient evidence. Quick uses a focused authoritative pass; standard triangulates the important claims; deep broadens source and counter-evidence coverage while remaining bounded to the question.

Produce findings and citations without starting planning, prototyping, or implementation automatically.

## Completion report and next steps

This invocation has one root skill: `/qs-plan-research`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-plan-spec`, `/qs-design-prototype`, `/qs-plan-clarify`. Failure routes: `/qs-plan-spec`, `/qs-design-prototype`, `/qs-plan-clarify`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-plan-research
Outcome: Concise verified result.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-plan-spec, $qs-specialists:qs-design-prototype, $qs-skills:qs-plan-clarify); Claude uses `/qs-plan-spec`, `/qs-design-prototype`, `/qs-plan-clarify`; Pi uses `/skill:qs-plan-spec`, `/skill:qs-design-prototype`, `/skill:qs-plan-clarify`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
