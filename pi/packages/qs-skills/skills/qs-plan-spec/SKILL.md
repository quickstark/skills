---
name: qs-plan-spec
description: "Produce an actionable specification, dependency-aware tickets, or both."
disable-model-invocation: true
---

# Write specs and tickets

Turn confirmed requirements into an actionable specification, dependency-aware tickets, or both when explicitly requested. Do not reopen settled product decisions unless project evidence exposes a contradiction.

## Internal capabilities

Load the relevant non-command references from `skills/internal/` in the canonical repository or `capabilities/` in a packaged plugin:

- Domain modeling when precise vocabulary changes requirements or interfaces.
- Module decomposition when ownership, interfaces, or test seams need design.
- Ticket decomposition when explicitly requested, required by the configured tracker, or needed for safely assignable work.

Capability use remains part of this root run and produces no separate skill report.

## Specification contents

- Problem, scope, exclusions, and governing decisions.
- Current-state evidence and constraints.
- Required behavior, interfaces, data, failure handling, and migration impact.
- Implementation boundaries and dependency order.
- Verification evidence for every acceptance criterion.
- Security, operational, compatibility, and rollout concerns when relevant.
- Open questions only when they truly block implementation.

Where architecture is unsettled, compare at least two viable boundaries against domain responsibilities, caller migration, failure isolation, and test seams. Prefer a design whose safety properties can be enforced structurally and whose legacy interfaces can be removed only after callers migrate.

Specification-only requests do not create tickets. When tickets are requested, create dependency-ordered, independently verifiable slices in the same run. Give every ticket one outcome, explicit scope and exclusions, acceptance evidence, and dependencies. Do not start implementation automatically.

## Completion report and next steps

This invocation has one root skill: `/qs-plan-spec`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-code-build`, `/qs-plan-clarify`, `/qs-flow-handoff`. Failure routes: `/qs-code-build`, `/qs-plan-clarify`, `/qs-flow-handoff`. Tailor every prompt to the completed work. When the remaining objective fits, the preferred prompt may use this catalog-approved composite workflow: $qs-skills:qs-code-build, then $qs-skills:qs-review-code, then $qs-specialists:qs-test-verify, then $qs-skills:qs-git-merge. Treat every step as a separate public root with its own completion report and authority boundary. Continue in this session only after a Complete result; stop on continuation-required, input-required, failed. This combined prompt does not grant commit, merge, push, release, deployment, installation, or other mutation authority unless the shared objective explicitly grants that exact action. This preserves each separate public root, must stop on a non-complete result, and does not add mutation authority.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-plan-spec
Outcome: Concise verified result.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-code-build, $qs-skills:qs-plan-clarify, $qs-skills:qs-flow-handoff); Claude uses `/qs-code-build`, `/qs-plan-clarify`, `/qs-flow-handoff`; Pi uses `/skill:qs-code-build`, `/skill:qs-plan-clarify`, `/skill:qs-flow-handoff`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
