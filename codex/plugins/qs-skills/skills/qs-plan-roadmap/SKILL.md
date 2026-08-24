---
name: qs-plan-roadmap
description: "Sequence confirmed outcomes, decisions, and dependencies into a practical roadmap."
---

# Plan a roadmap

Organize confirmed outcomes into dependency-aware phases without inventing requirements or implementation detail.

## Behavior

- Read existing plans, issues, architecture, and delivery constraints.
- Separate outcome milestones from unresolved decision gates.
- Order work by real dependency, risk retirement, and independently verifiable value.
- Identify explicit prerequisites, parallelizable work, stop conditions, and deferred scope.
- Keep each phase bounded and give it observable completion evidence.
- Compare materially different sequences before settling the critical path, and make shared-state ownership explicit before parallelizing work.

Quick produces the critical path. Standard includes meaningful dependencies and risks. Deep evaluates alternative sequences and cross-team or release constraints. End with the roadmap only; do not start research, specification, or implementation automatically.

## Completion report and next steps

This invocation has one root skill: `/qs-plan-roadmap`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Resolve governing specifications from explicit input, repository documentation, or a verified tracker. Every result includes `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Include `Remaining build:` with a known total when available and a preview of up to three highest-priority pending requirements or tickets. Write `None identified against linked specs` only after verifying completion against those specs.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-plan-spec`, `/qs-plan-clarify`, `/qs-flow-handoff`. Failure routes: `/qs-plan-spec`, `/qs-plan-clarify`, `/qs-flow-handoff`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-plan-roadmap
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Remaining build: concise verified preview
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-plan-spec, $qs-skills:qs-plan-clarify, $qs-skills:qs-flow-handoff); Claude uses `/qs-plan-spec`, `/qs-plan-clarify`, `/qs-flow-handoff`; Pi uses `/skill:qs-plan-spec`, `/skill:qs-plan-clarify`, `/skill:qs-flow-handoff`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
