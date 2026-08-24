---
name: ps-runtime-forensics
description: "Diagnose one live runtime symptom from actual measurements without repairing it."
disable-model-invocation: true
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

Resolve governing specifications from explicit input, repository documentation, or a verified tracker. Every result includes `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Include `Remaining build:` with a known total when available and a preview of up to three highest-priority pending requirements or tickets. Write `None identified against linked specs` only after verifying completion against those specs.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-code-debug`, `/ps-trace-forensics`, `/qs-flow-handoff`. Failure routes: `/qs-code-debug`, `/qs-flow-handoff`, `/ps-trace-forensics`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /ps-runtime-forensics
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Remaining build: concise verified preview
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-code-debug, $ps-skills:ps-trace-forensics, $qs-skills:qs-flow-handoff); Claude uses `/qs-code-debug`, `/ps-trace-forensics`, `/qs-flow-handoff`; Pi uses `/skill:qs-code-debug`, `/skill:ps-trace-forensics`, `/skill:qs-flow-handoff`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
