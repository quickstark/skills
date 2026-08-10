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
| 50 | `/qs-plan-spec` | Confirmed work needs an actionable specification or tickets. |
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
- Recommend one command with one copy-ready prompt. If the requested work is already complete, recommend none.

## Completion report and next steps

This invocation has one root skill: `/qs-help`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. A complete result has no next prompt. Continuation-required and input-required have exactly one copy-ready prompt. Failed has at most one concrete recovery prompt. Failed required checks or actionable P0/P1 findings prohibit `complete`.

When a distinct workflow is genuinely required, the catalog-approved continuation is `/qs-setup`; tailor one prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, and the one continuation only when required. Full adds the evidence trail and alternatives but never extra prompts. Omit empty sections and routine successful detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-help
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Top next prompt: None — the requested work is complete. | one plain-text copy-ready prompt

When continuation is required, write `Top next prompt:` and place the single complete prompt beneath it as a plain Markdown paragraph beginning with the exact Codex skill literal $qs-skills:qs-setup. Claude uses `/qs-setup`. Never wrap the prompt in a fenced or indented code block, and do not put the prompt or skill literal in backticks. Put heuristic model/thinking guidance in a muted blockquote beneath it. Never change the active model or reasoning setting.
