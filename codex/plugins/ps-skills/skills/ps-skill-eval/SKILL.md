---
name: ps-skill-eval
description: "Compare a skill or prompt variant with its control through blinded recorded trials."
---

# Evaluate a skill variant

Run a declared, reproducible comparison within the selected evaluation fixtures and skill source.

## Required contract

Define the control and variant, task set, rubric, randomized or blinded assignment, retry policy, budget, and stopping rule before trials. Keep control and variant isolated and retain failed trials in the result.

Observable trial inputs, outputs, and checks are sufficient evidence. Transcript or run-history evidence is optional and may be used only through an available adapter after the user explicitly selects its source and scope; never scan unrelated workspaces or assume private history access.

Do not switch models secretly, claim performance without measurements, retry failures away, or change unrelated skill sources. Store only bounded evaluation fixtures and results.

## Completion report and next steps

This invocation has one root skill: `/ps-skill-eval`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Resolve governing specifications from explicit input, repository documentation, or a verified tracker. Every result includes `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Include `Work summary:` with known done, pending, and blocked totals when available, then outline up to three highest-priority verified tickets, specifications, issues, or grouped work items as `linked id — state — next action`. Group items only when they share the same state and next action. Write `None identified against linked specs` only after verifying completion against those specs.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit at most one copy-ready next-work prompt, and only when a distinct actionable item remains. Omit the prompt when the status is `complete` and there is no verified remaining work. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: `/qs-skill-write`, `/qs-plan-clarify`, `/qs-flow-handoff`. Failure routes: `/qs-plan-clarify`, `/qs-skill-write`, `/qs-flow-handoff`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, the work summary when applicable, and the optional next-work prompt. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /ps-skill-eval
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Work summary: verified totals and up to three linked items with state and next action
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Label the optional continuation `Next work prompt:`. When present, put it in one fenced `text` block beginning with its exact Codex literal ($qs-specialists:qs-skill-write, $qs-skills:qs-plan-clarify, $qs-skills:qs-flow-handoff); Claude uses `/qs-skill-write`, `/qs-plan-clarify`, `/qs-flow-handoff`; Pi uses `/skill:qs-skill-write`, `/skill:qs-plan-clarify`, `/skill:qs-flow-handoff`. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. When absent, write `Next work prompt: None — no follow-on needed.` A host may offer an Add action for the fenced prompt, but never claim that it rendered. Keep model guidance outside the fence and never change the active model or reasoning setting.
