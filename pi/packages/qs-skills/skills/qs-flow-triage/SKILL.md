---
name: qs-flow-triage
description: "Assess incoming work and record one bounded recommended route."
disable-model-invocation: true
---

# Triage incoming work

Inspect the issue, duplicates, project evidence, tracker conventions, impact, urgency, reproducibility, dependencies, and missing acceptance evidence.

Record one disposition and one recommended root workflow. Update tracker state only when authorized. Never invoke the routed workflow automatically, never claim it ran, and do not turn triage into implementation.

Quick handles one clear item. Standard handles a bounded batch with normal evidence. Deep may reconcile wider dependencies and duplicates but still produces one route per item and no public-skill hops.

## Completion report and next steps

This invocation has one root skill: `/qs-flow-triage`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Resolve governing specifications from explicit input, repository documentation, or a verified tracker. Every result includes `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Include `Work summary:` with known done, pending, and blocked totals when available, then outline up to three highest-priority verified tickets, specifications, issues, or grouped work items as `linked id — state — next action`. Group items only when they share the same state and next action. Write `None identified against linked specs` only after verifying completion against those specs.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit at most one copy-ready next-work prompt, and only when a distinct actionable item remains. Omit the prompt when the status is `complete` and there is no verified remaining work. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: `/qs-plan-roadmap`, `/qs-code-debug`, `/qs-code-build`. Failure routes: `/qs-code-debug`, `/qs-plan-roadmap`, `/qs-code-build`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, the work summary when applicable, and the optional next-work prompt. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-flow-triage
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Work summary: verified totals and up to three linked items with state and next action
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Label the optional continuation `Next work prompt:`. When present, put it in one fenced `text` block beginning with its exact Codex literal ($qs-skills:qs-plan-roadmap, $qs-skills:qs-code-debug, $qs-skills:qs-code-build); Claude uses `/qs-plan-roadmap`, `/qs-code-debug`, `/qs-code-build`; Pi uses `/skill:qs-plan-roadmap`, `/skill:qs-code-debug`, `/skill:qs-code-build`. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. When absent, write `Next work prompt: None — no follow-on needed.` A host may offer an Add action for the fenced prompt, but never claim that it rendered. Keep model guidance outside the fence and never change the active model or reasoning setting.
