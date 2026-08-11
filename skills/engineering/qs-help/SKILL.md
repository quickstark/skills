---
name: qs-help
description: "Choose one bounded QuickStark workflow from the v3 core or optional specialists."
disable-model-invocation: true
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

This invocation has one root skill: `/qs-help`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. Every result emits three ranked copy-ready prompts: one opinionated preferred prompt followed by two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

The default ranked continuations are `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-setup`. A failed result instead ranks `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-setup`. Tailor each prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, one preferred prompt, and two alternatives. Full adds the evidence trail but never extra prompts. Omit empty sections and routine successful detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-help
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Present prompts in normalized rank order. Label the first `Preferred next prompt:` and the remaining two `Alternative next prompt:`. Put each complete prompt in its own fenced `text` block beginning with its exact Codex skill literal ($qs-skills:qs-plan-clarify, $qs-skills:qs-flow-triage, $qs-skills:qs-setup); Claude uses `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-setup`. The fence info string must be exactly `text` so the chat renders it as Plain text; never use `markdown`, `bash`, `json`, or another language. Keep every prompt concise and carry forward only the outcome plus the single highest-value evidence item. Put heuristic model/thinking guidance outside each fence in a muted blockquote. Never change the active model or reasoning setting.
