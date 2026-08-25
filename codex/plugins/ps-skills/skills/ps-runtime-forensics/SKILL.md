---
name: ps-runtime-forensics
description: "Diagnose one live runtime symptom from actual measurements without repairing it."
---

# Diagnose a live runtime symptom

Own diagnosis only. Temporary, non-product evidence artifacts and existing instrumentation are allowed; tracked product changes are not.

## Behavior

1. Record the symptom, environment, time window, expected baseline, and access boundaries.
2. Capture bounded measurements with secrets and sensitive payloads redacted.
3. Form competing hypotheses and choose observations that can falsify them.
4. Compare measurements with the baseline and isolate the causal mechanism.
5. Stop with a diagnosis, uncertainty, and reproducible evidence.

If durable instrumentation or a product repair is needed, return `continuation-required` before changing tracked product source. Never include sensitive artifact contents, private paths, or credential values in the chat result.

## Completion report and next steps

This invocation has one root skill: `/ps-runtime-forensics`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Resolve governing specifications from explicit input, repository documentation, or a verified tracker. Every result includes `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Include `Work summary:` with known done, pending, and blocked totals when available, then outline up to three highest-priority verified tickets, specifications, issues, or grouped work items as `linked id — state — next action`. Group items only when they share the same state and next action. Write `None identified against linked specs` only after verifying completion against those specs.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit at most one copy-ready next-work prompt, and only when a distinct actionable item remains. Omit the prompt when the status is `complete` and there is no verified remaining work. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: `/qs-code-debug`, `/ps-trace-forensics`, `/qs-flow-handoff`. Failure routes: `/qs-code-debug`, `/qs-flow-handoff`, `/ps-trace-forensics`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, the work summary when applicable, and the optional next-work prompt. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /ps-runtime-forensics
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Work summary: verified totals and up to three linked items with state and next action
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Label the optional continuation `Next work prompt:`. When present, put it in one fenced `text` block beginning with its exact Codex literal ($qs-skills:qs-code-debug, $ps-skills:ps-trace-forensics, $qs-skills:qs-flow-handoff); Claude uses `/qs-code-debug`, `/ps-trace-forensics`, `/qs-flow-handoff`; Pi uses `/skill:qs-code-debug`, `/skill:ps-trace-forensics`, `/skill:qs-flow-handoff`. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. When absent, write `Next work prompt: None — no follow-on needed.` A host may offer an Add action for the fenced prompt, but never claim that it rendered. Keep model guidance outside the fence and never change the active model or reasoning setting.
