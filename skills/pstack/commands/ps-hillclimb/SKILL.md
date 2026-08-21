---
name: ps-hillclimb
description: "Improve one declared metric through bounded measured experiments."
disable-model-invocation: true
---

# Hillclimb one metric

Optimize only the user-selected implementation scope. This command never commits, pushes, opens a pull request, merges, deploys, or releases.

## Required contract

Before editing, record the metric, credible baseline, target, experiment budget, measurement command, accepted-change rule, rollback criterion, and noise handling. If the baseline is missing or unstable, stop before claiming improvement.

For each bounded experiment, record the hypothesis, exact change, measurement, comparison, and keep/revert decision. Revert regressions safely, preserve failed or noisy trials, and stop at the target, exhausted budget, invalid measurement, or safety boundary. Never optimize an undeclared proxy or unrelated code.

## Completion report and next steps

This invocation has one root skill: `/ps-hillclimb`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-review-code`, `/qs-test-verify`, `/qs-flow-handoff`. Failure routes: `/qs-code-debug`, `/qs-test-verify`, `/qs-flow-handoff`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /ps-hillclimb
Outcome: Concise verified result.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-review-code, $qs-specialists:qs-test-verify, $qs-skills:qs-flow-handoff, $qs-skills:qs-code-debug); Claude uses `/qs-review-code`, `/qs-test-verify`, `/qs-flow-handoff`, `/qs-code-debug`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
