---
name: qs-skill-write
description: "Create or improve one focused, testable agent skill."
disable-model-invocation: true
---

# Write an agent skill

This optional specialist defines one durable user intent, explicit invocation boundary, allowed tools and mutations, bounded workflow, failure behavior, and independently verifiable completion contract.

Inspect the host's current skill format and repository conventions. Keep instructions direct, eliminate overlapping commands and automatic public-skill chains, reuse shared policy instead of duplicating boilerplate, and add behavioral validation for routing and safety. Never claim installation or publication until verified.

Treat authoring as interface design: define one observable outcome, encode recurring lessons in structure or tests, make operations rerunnable, and compare a variant with its control when a prompt change makes a performance claim. Prefer plain language and cite primary technical standards where they govern behavior.

## Completion report and next steps

This invocation has one root skill: `/qs-skill-write`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Resolve governing specifications from explicit input, repository documentation, or a verified tracker. Every result includes `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Include `Work summary:` with known done, pending, and blocked totals when available, then outline up to three highest-priority verified tickets, specifications, issues, or grouped work items as `linked id — state — next action`. Group items only when they share the same state and next action. Write `None identified against linked specs` only after verifying completion against those specs.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit at most one copy-ready next-work prompt, and only when a distinct actionable item remains. Omit the prompt when the status is `complete` and there is no verified remaining work. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: `/qs-review-code`, `/qs-test-verify`, `/qs-git-merge`. Failure routes: `/qs-review-code`, `/qs-test-verify`, `/qs-flow-handoff`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, the work summary when applicable, and the optional next-work prompt. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-skill-write
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Work summary: verified totals and up to three linked items with state and next action
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Label the optional continuation `Next work prompt:`. When present, put it in one fenced `text` block beginning with its exact Codex literal ($qs-skills:qs-review-code, $qs-specialists:qs-test-verify, $qs-skills:qs-git-merge, $qs-skills:qs-flow-handoff); Claude uses `/qs-review-code`, `/qs-test-verify`, `/qs-git-merge`, `/qs-flow-handoff`; Pi uses `/skill:qs-review-code`, `/skill:qs-test-verify`, `/skill:qs-git-merge`, `/skill:qs-flow-handoff`. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. When absent, write `Next work prompt: None — no follow-on needed.` The fenced prompt is copy-ready only; plain skill Markdown cannot request or guarantee an Add action. Keep model guidance outside the fence and never change the active model or reasoning setting.
