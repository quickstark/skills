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

Resolve governing specifications from explicit input, repository documentation, or a verified tracker. Every result includes `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Include `Work summary:` with known done, pending, and blocked totals when available, then outline up to three highest-priority verified tickets, specifications, issues, or grouped work items as `linked id — state — next action`. Group items only when they share the same state and next action. Write `None identified against linked specs` only after verifying completion against those specs.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit at most one copy-ready next-work prompt, and only when a distinct actionable item remains. Omit the prompt when the status is `complete` and there is no verified remaining work. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: `/qs-review-code`, `/qs-git-merge`, `/qs-flow-handoff`. Failure routes: `/qs-code-debug`, `/qs-review-code`, `/qs-flow-handoff`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, the work summary when applicable, and the optional next-work prompt. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-code-document
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Work summary: verified totals and up to three linked items with state and next action
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Label the optional continuation `Next work prompt:`. When present, put it in one fenced `text` block beginning with its exact Codex literal ($qs-skills:qs-review-code, $qs-skills:qs-git-merge, $qs-skills:qs-flow-handoff, $qs-skills:qs-code-debug); Claude uses `/qs-review-code`, `/qs-git-merge`, `/qs-flow-handoff`, `/qs-code-debug`; Pi uses `/skill:qs-review-code`, `/skill:qs-git-merge`, `/skill:qs-flow-handoff`, `/skill:qs-code-debug`. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. When absent, write `Next work prompt: None — no follow-on needed.` A host may offer an Add action for the fenced prompt, but never claim that it rendered. Keep model guidance outside the fence and never change the active model or reasoning setting.
