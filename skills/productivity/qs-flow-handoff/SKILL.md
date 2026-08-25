---
name: qs-flow-handoff
description: "Preserve verified state and ranked next actions for another operator or invocation."
disable-model-invocation: true
---

# Create a handoff

Capture only verified current state: objective, completed work, governing decisions, changed and unrelated dirty files, checks, branch/commit/PR state, blockers, risks, and the exact remaining boundary.

Do not claim a receiving workflow has run. Provide one preferred copy-ready continuation and two concise alternatives with the evidence needed to resume safely.

Keep the handoff concise enough to resume without rereading the full session. Never include credentials or private values.

Include rerunnable commands, exact artifact identities, and the last proven boundary. Distinguish completed evidence from planned actions so resumption never depends on hidden transcript context.

## Completion report and next steps

This invocation has one root skill: `/qs-flow-handoff`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Resolve governing specifications from explicit input, repository documentation, or a verified tracker. Every result includes `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Include `Work summary:` with known done, pending, and blocked totals when available, then outline up to three highest-priority verified tickets, specifications, issues, or grouped work items as `linked id — state — next action`. Group items only when they share the same state and next action. Write `None identified against linked specs` only after verifying completion against those specs.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit at most one copy-ready next-work prompt, and only when a distinct actionable item remains. Omit the prompt when the status is `complete` and there is no verified remaining work. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: `/qs-help`, `/qs-code-build`, `/qs-plan-clarify`. Failure routes: `/qs-help`, `/qs-code-build`, `/qs-plan-clarify`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, the work summary when applicable, and the optional next-work prompt. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-flow-handoff
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Work summary: verified totals and up to three linked items with state and next action
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Label the optional continuation `Next work prompt:`. When present, put it in one fenced `text` block beginning with its exact Codex literal ($qs-skills:qs-help, $qs-skills:qs-code-build, $qs-skills:qs-plan-clarify); Claude uses `/qs-help`, `/qs-code-build`, `/qs-plan-clarify`; Pi uses `/skill:qs-help`, `/skill:qs-code-build`, `/skill:qs-plan-clarify`. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. When absent, write `Next work prompt: None — no follow-on needed.` The fenced prompt is copy-ready only; plain skill Markdown cannot request or guarantee an Add action. Keep model guidance outside the fence and never change the active model or reasoning setting.
