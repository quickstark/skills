---
name: qs-help
description: "Choose one bounded QuickStark workflow from the v3 core or optional specialists."
---

# QuickStark help

Inspect the request and available project evidence, then recommend the single best root command. Do not execute it automatically.

## Core commands

| Order | Command | Use when |
| ---: | --- | --- |
| 10 | `/qs-help` | The correct workflow is unclear. |
| 20 | `/qs-setup` | A project needs QuickStark configuration or verification. |
| 30 | `/qs-plan-clarify` | Ambiguity, scope, constraints, or decisions remain. |
| 40 | `/qs-plan-roadmap` | Confirmed outcomes need sequencing across phases. |
| 50 | `/qs-plan-spec` | Confirmed work needs an actionable spec or dependency-aware tickets. |
| 60 | `/qs-code-build` | A scoped change is ready to implement. |
| 70 | `/qs-code-debug` | A reproducible defect needs diagnosis and repair. |
| 80 | `/qs-review-code` | Code or a change needs review, scoped improvement, or refactoring. |
| 90 | `/qs-git-merge` | Selected changes need safe Git integration or publication. |
| 100 | `/qs-deploy-release` | A documented release or deployment is explicitly requested. |
| 110 | `/qs-flow-triage` | Incoming work needs one bounded route. |
| 120 | `/qs-flow-handoff` | Verified state must be transferred. |

## Optional specialists

`/qs-plan-research`, `/qs-design-prototype`, `/qs-code-document`, `/qs-test-author`, `/qs-test-verify`, `/qs-learn-teach`, and `/qs-skill-write` are independently installable in `qs-specialists`. Core workflows do not require them.

## Routing rules

- Prefer the command whose primary outcome matches the request, not an intermediate technique.
- Refactoring belongs to `/qs-review-code` with `action=improve` and a narrow selected target. Whole-codebase refactoring starts with a bounded read-only review.
- Adding or improving tests for already-established behavior belongs to `/qs-test-author`; executing and reporting a read-only verification matrix belongs to `/qs-test-verify`.
- Test-driven development is internal to `/qs-code-build`, not a command.
- Domain modeling, module decomposition, and ticket decomposition are internal planning or implementation capabilities.
- Recommend three commands in ranked order: one opinionated preferred route and two useful alternatives. Keep each copy-ready prompt concise.

## Completion report and next steps

This invocation has one root skill: `/qs-help`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-setup`. Failure routes: `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-setup`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-help
Outcome: Concise verified result.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-plan-clarify, $qs-skills:qs-flow-triage, $qs-skills:qs-setup); Claude uses `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-setup`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
