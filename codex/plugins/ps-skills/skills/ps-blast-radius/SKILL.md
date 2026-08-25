---
name: ps-blast-radius
description: "Map the impact of one proposed change across callers, contracts, data, tests, and operations."
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

Resolve governing specifications from explicit input, repository documentation, or a verified tracker. Every result includes `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Include `Work summary:` with known done, pending, and blocked totals when available, then outline up to three highest-priority verified tickets, specifications, issues, or grouped work items as `linked id — state — next action`. Group items only when they share the same state and next action. Write `None identified against linked specs` only after verifying completion against those specs.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit at most one copy-ready next-work prompt, and only when a distinct actionable item remains. Omit the prompt when the status is `complete` and there is no verified remaining work. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: `/qs-plan-spec`, `/qs-review-code`, `/qs-flow-handoff`. Failure routes: `/qs-plan-clarify`, `/qs-flow-handoff`, `/ps-how`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, the work summary when applicable, and the optional next-work prompt. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /ps-blast-radius
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Work summary: verified totals and up to three linked items with state and next action
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Label the optional continuation `Next work prompt:`. When present, put it in one fenced `text` block beginning with its exact Codex literal ($qs-skills:qs-plan-spec, $qs-skills:qs-review-code, $qs-skills:qs-flow-handoff, $qs-skills:qs-plan-clarify, $ps-skills:ps-how); Claude uses `/qs-plan-spec`, `/qs-review-code`, `/qs-flow-handoff`, `/qs-plan-clarify`, `/ps-how`; Pi uses `/skill:qs-plan-spec`, `/skill:qs-review-code`, `/skill:qs-flow-handoff`, `/skill:qs-plan-clarify`, `/skill:ps-how`. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. When absent, write `Next work prompt: None — no follow-on needed.` A host may offer an Add action for the fenced prompt, but never claim that it rendered. Keep model guidance outside the fence and never change the active model or reasoning setting.
