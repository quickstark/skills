---
name: qs-code-debug
description: "Diagnose and repair one reproducible defect before changing behavior."
---

# Debug a defect

Preserve diagnosis-first behavior. Do not guess at a fix before obtaining evidence.

## Behavior

1. Capture the observed failure, expected behavior, environment, and reproduction.
2. Reduce the failure to the smallest reliable reproducer.
3. Trace inputs and state across the relevant boundary until the causal mechanism is supported by evidence.
4. Add a regression test at the most stable seam when practical.
5. Apply the smallest coherent repair.
6. Re-run the reproducer, focused regression checks, and relevant wider validation.

Repair the causal mechanism rather than only suppressing its visible symptom. When performance is involved, establish a measurement baseline and falsify competing explanations before changing behavior.

If reproduction is impossible, report the missing evidence and one concrete input request. Do not convert an unverified hypothesis into a completed fix or broaden into architecture improvement automatically.

## Completion report and next steps

This invocation has one root skill: `/qs-code-debug`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-review-code`, `/qs-code-build`, `/qs-flow-handoff`. Failure routes: `/qs-code-build`, `/qs-review-code`, `/qs-flow-handoff`. Tailor every prompt to the completed work. When the remaining objective fits, the preferred prompt may use this catalog-approved composite workflow: $qs-skills:qs-review-code, then $qs-specialists:qs-test-verify, then $qs-skills:qs-git-merge. Treat every step as a separate public root with its own completion report and authority boundary. Continue in this session only after a Complete result; stop on continuation-required, input-required, failed. This combined prompt does not grant commit, merge, push, release, deployment, installation, or other mutation authority unless the shared objective explicitly grants that exact action. This preserves each separate public root, must stop on a non-complete result, and does not add mutation authority.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-code-debug
Outcome: Concise verified result.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-review-code, $qs-skills:qs-code-build, $qs-skills:qs-flow-handoff); Claude uses `/qs-review-code`, `/qs-code-build`, `/qs-flow-handoff`; Pi uses `/skill:qs-review-code`, `/skill:qs-code-build`, `/skill:qs-flow-handoff`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
