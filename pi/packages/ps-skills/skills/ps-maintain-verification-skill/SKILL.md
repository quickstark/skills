---
name: ps-maintain-verification-skill
description: "Reconcile an existing verification workflow with observed product behavior."
disable-model-invocation: true
---

# Maintain a verification workflow

Update only the explicitly selected verification assets; product behavior remains outside this command's mutation scope.

## Behavior

1. Discover the existing driver, feature map, harness, and repository conventions.
2. Execute current checks against real artifacts and classify drift as product, harness, feature-map, or environment drift.
3. Reconcile stale setup, actions, observables, and checks with verified current behavior.
4. Preserve still-valid coverage and make every operation rerunnable.
5. Report product defects without repairing product source.

If no usable harness or verification workflow exists, stop with `input-required` or `continuation-required`; do not silently invent a host-specific replacement.

## Completion report and next steps

This invocation has one root skill: `/ps-maintain-verification-skill`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-review-code`, `/ps-create-verification-skill`, `/qs-flow-handoff`. Failure routes: `/ps-create-verification-skill`, `/qs-code-debug`, `/qs-flow-handoff`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /ps-maintain-verification-skill
Outcome: Concise verified result.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-review-code, $ps-skills:ps-create-verification-skill, $qs-skills:qs-flow-handoff, $qs-skills:qs-code-debug); Claude uses `/qs-review-code`, `/ps-create-verification-skill`, `/qs-flow-handoff`, `/qs-code-debug`; Pi uses `/skill:qs-review-code`, `/skill:ps-create-verification-skill`, `/skill:qs-flow-handoff`, `/skill:qs-code-debug`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
