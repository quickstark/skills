---
name: qs-design-prototype
description: "Build a disposable prototype to answer one design question."
---

# Prototype a design decision

This optional specialist creates the smallest disposable artifact that can answer the selected question. State the hypothesis, success evidence, time/scope bound, and what must not be mistaken for production quality.

Explore materially different candidates before polishing one direction. Evaluate each against the same user outcome, constraints, and observable experience; preserve discarded alternatives and the decision rationale as evidence inside this run.

Reuse safe existing assets when helpful, isolate prototype code from production paths, and validate the hypothesis directly. Report what the prototype demonstrated, failed to demonstrate, and which parts must be discarded. Do not promote prototype code or begin production implementation automatically.

## Completion report and next steps

This invocation has one root skill: `/qs-design-prototype`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Resolve governing specifications from explicit input, repository documentation, or a verified tracker. Every result includes `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Include `Remaining build:` with a known total when available and a preview of up to three highest-priority pending requirements or tickets. Write `None identified against linked specs` only after verifying completion against those specs.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-plan-spec`, `/qs-code-build`, `/qs-plan-clarify`. Failure routes: `/qs-plan-spec`, `/qs-code-build`, `/qs-plan-clarify`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-design-prototype
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Remaining build: concise verified preview
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-plan-spec, $qs-skills:qs-code-build, $qs-skills:qs-plan-clarify); Claude uses `/qs-plan-spec`, `/qs-code-build`, `/qs-plan-clarify`; Pi uses `/skill:qs-plan-spec`, `/skill:qs-code-build`, `/skill:qs-plan-clarify`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
