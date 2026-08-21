---
name: qs-code-document
description: "Write concise documentation from verified project behavior and interfaces."
---

# Document verified behavior

This optional specialist updates only the selected documentation scope. Inspect the implementation, configuration, commands, tests, and existing docs before writing.

Write for the reader's next decision: lead with the outcome, use established project vocabulary, remove repetition and vague filler, and distinguish verified behavior from examples or inference. When a technical rule depends on an external standard, cite the primary specification rather than a secondary summary.

Distinguish verified current behavior from planned behavior. Prefer the shortest explanation that lets the intended reader act correctly. Validate commands and links when safe, preserve project terminology, and identify any behavior that could not be verified. Do not change product behavior or start release work automatically.

## Completion report and next steps

This invocation has one root skill: `/qs-code-document`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-review-code`, `/qs-git-merge`, `/qs-flow-handoff`. Failure routes: `/qs-code-debug`, `/qs-review-code`, `/qs-flow-handoff`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-code-document
Outcome: Concise verified result.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-review-code, $qs-skills:qs-git-merge, $qs-skills:qs-flow-handoff, $qs-skills:qs-code-debug); Claude uses `/qs-review-code`, `/qs-git-merge`, `/qs-flow-handoff`, `/qs-code-debug`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
