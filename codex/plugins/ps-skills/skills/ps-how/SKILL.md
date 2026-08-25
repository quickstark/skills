---
name: ps-how
description: "Explain how a selected subsystem works from code and observed interfaces."
---

# Explain how a subsystem works

Produce a read-only, evidence-based walkthrough of one selected subsystem.

## Behavior

1. Bound the subsystem and the caller-visible question.
2. Trace representative inputs through entry points, state transitions, boundaries, and outputs.
3. Distinguish directly observed facts from inferences and unresolved uncertainty.
4. Cite files, interfaces, tests, or runtime evidence near each material claim.
5. Explain failure modes and operational effects only when supported.

Use optional adapters only when available and selected. Missing history, issue, chat, or observability providers reduce the evidence available; they do not justify invention. Do not implement changes.

## Completion report and next steps

This invocation has one root skill: `/ps-how`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. The current root being `complete` does not prove that the larger project is complete. Emit at most one copy-ready next-work prompt when a distinct verified actionable item remains and an eligible route owns it. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: `/ps-blast-radius`, `/qs-plan-spec`, `/ps-why`. Failure routes: `/qs-plan-clarify`, `/qs-flow-handoff`, `/ps-why`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output always contains status, outcome, noteworthy failed checks, material outputs, and the Next work prompt label. Full adds the evidence trail, never more prompts. Omit empty optional sections and routine success detail; never omit the required result fields.

Status: Complete | Continuation required | Input required | Failed
Skills used: /ps-how
Outcome: Concise verified result.
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Always write `Next work prompt:`. When a distinct verified actionable item exists, put one fenced `text` block beneath it beginning with its exact Codex literal ($ps-skills:ps-blast-radius, $qs-skills:qs-plan-spec, $ps-skills:ps-why, $qs-skills:qs-plan-clarify, $qs-skills:qs-flow-handoff); Claude uses `/ps-blast-radius`, `/qs-plan-spec`, `/ps-why`, `/qs-plan-clarify`, `/qs-flow-handoff`; Pi uses `/skill:ps-blast-radius`, `/skill:qs-plan-spec`, `/skill:ps-why`, `/skill:qs-plan-clarify`, `/skill:qs-flow-handoff`. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. Do not replace the fenced block with inline prose, a bare command, or a link. Only when no eligible actionable item remains, write `Next work prompt: None — no follow-on needed.` The fenced prompt is copy-ready only; plain skill Markdown cannot request or guarantee an Add action. Keep model guidance outside the fence and never change the active model or reasoning setting.
