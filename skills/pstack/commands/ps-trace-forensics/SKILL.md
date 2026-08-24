---
name: ps-trace-forensics
description: "Diagnose one supplied profiling or trace artifact without changing product behavior."
disable-model-invocation: true
---

# Diagnose a supplied trace

Analyze one bounded trace, profile, recording, or diagnostic artifact as a read-only root.

## Behavior

1. Verify artifact identity, capture context, tool/version, time range, and expected baseline.
2. Redact or omit secrets, user payloads, and unsafe paths before reporting.
3. Identify dominant spans, stacks, waits, allocations, or event sequences.
4. Test competing hypotheses against the artifact and corroborating code.
5. Report the supported diagnosis, residual uncertainty, and reproducible evidence.

Do not repair product behavior or add durable instrumentation. If either is required, return `continuation-required` with a separate debug prompt.

## Completion report and next steps

This invocation has one root skill: `/ps-trace-forensics`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-code-debug`, `/ps-runtime-forensics`, `/qs-flow-handoff`. Failure routes: `/qs-code-debug`, `/qs-flow-handoff`, `/ps-runtime-forensics`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /ps-trace-forensics
Outcome: Concise verified result.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-code-debug, $ps-skills:ps-runtime-forensics, $qs-skills:qs-flow-handoff); Claude uses `/qs-code-debug`, `/ps-runtime-forensics`, `/qs-flow-handoff`; Pi uses `/skill:qs-code-debug`, `/skill:ps-runtime-forensics`, `/skill:qs-flow-handoff`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
