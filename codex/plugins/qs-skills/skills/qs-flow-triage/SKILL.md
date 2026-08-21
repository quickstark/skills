---
name: qs-flow-triage
description: "Assess incoming work and record one bounded recommended route."
---

# Triage incoming work

Inspect the issue, duplicates, project evidence, tracker conventions, impact, urgency, reproducibility, dependencies, and missing acceptance evidence.

Record one disposition and one recommended root workflow. Update tracker state only when authorized. Never invoke the routed workflow automatically, never claim it ran, and do not turn triage into implementation.

Quick handles one clear item. Standard handles a bounded batch with normal evidence. Deep may reconcile wider dependencies and duplicates but still produces one route per item and no public-skill hops.

## Completion report and next steps

This invocation has one root skill: `/qs-flow-triage`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-plan-roadmap`, `/qs-code-debug`, `/qs-code-build`. Failure routes: `/qs-code-debug`, `/qs-plan-roadmap`, `/qs-code-build`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-flow-triage
Outcome: Concise verified result.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-plan-roadmap, $qs-skills:qs-code-debug, $qs-skills:qs-code-build); Claude uses `/qs-plan-roadmap`, `/qs-code-debug`, `/qs-code-build`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
