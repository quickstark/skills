---
name: qs-setup
description: "Prepare or verify QuickStark configuration for one project."
disable-model-invocation: true
---

# QuickStark setup

Prepare or verify only the selected project. Inspect existing configuration before editing and preserve project conventions.

## Behavior

1. Resolve the repository root and read its agent instructions.
2. Detect the issue tracker, documentation conventions, test commands, release workflow, and existing QuickStark configuration.
3. Ask only for a material choice that cannot be inferred safely.
4. Create or repair the minimum project-owned configuration needed for the confirmed workflow.
5. Run targeted validation and report actual readiness.

Never create remote resources, credentials, releases, or deployments unless separately requested. Setup ends after configuration verification; it does not start planning or implementation.

## Modes

- Quick: verify the existing configuration and report the first blocking gap.
- Standard: verify and safely repair the normal project configuration.
- Deep: include wider integration and documentation checks without expanding project scope.

## Completion report and next steps

This invocation has one root skill: `/qs-setup`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit at most one copy-ready next-work prompt, and only when a distinct actionable item remains. Omit the prompt when the status is `complete` and there is no verified remaining work. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-plan-roadmap`. Failure routes: `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-plan-roadmap`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, the work summary when applicable, and the optional next-work prompt. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-setup
Outcome: Concise verified result.
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Label the optional continuation `Next work prompt:`. When present, put it in one fenced `text` block beginning with its exact Codex literal ($qs-skills:qs-plan-clarify, $qs-skills:qs-flow-triage, $qs-skills:qs-plan-roadmap); Claude uses `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-plan-roadmap`; Pi uses `/skill:qs-plan-clarify`, `/skill:qs-flow-triage`, `/skill:qs-plan-roadmap`. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. When absent, write `Next work prompt: None — no follow-on needed.` The fenced prompt is copy-ready only; plain skill Markdown cannot request or guarantee an Add action. Keep model guidance outside the fence and never change the active model or reasoning setting.
