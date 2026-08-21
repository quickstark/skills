---
name: ps-pr-babysit
description: "Drive one selected pull request to a truthful merge-ready assessment."
disable-model-invocation: true
---

# Babysit one pull request

Resolve the exact repository, pull request, head revision, branch or worktree, checks, reviews, and mergeability before acting.

## Authority modes

- Inspect-only: observe and report; never edit, push, dismiss, or mutate remote state.
- Authorized repair: make bounded repairs only on the selected PR branch or worktree, validate them, and push only when the user granted push authority.

Use bounded waits with a deadline, cancellation checks, and a maximum retry count. Re-resolve head state after every external change. Stop on cancellation, timeout, lost authority, branch mismatch, ambiguous review state, or a blocker outside scope.

Never merge, enable auto-merge or merge-when-ready, alter stack topology, deploy, release, or mutate an unrelated branch. Report readiness honestly even when unresolved.

## Completion report and next steps

This invocation has one root skill: `/ps-pr-babysit`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-git-merge`, `/qs-code-debug`, `/qs-flow-handoff`. Failure routes: `/qs-code-debug`, `/qs-review-code`, `/qs-flow-handoff`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /ps-pr-babysit
Outcome: Concise verified result.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-git-merge, $qs-skills:qs-code-debug, $qs-skills:qs-flow-handoff, $qs-skills:qs-review-code); Claude uses `/qs-git-merge`, `/qs-code-debug`, `/qs-flow-handoff`, `/qs-review-code`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
