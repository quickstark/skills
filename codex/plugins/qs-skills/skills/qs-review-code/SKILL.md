---
name: qs-review-code
description: "Review a change or selected codebase scope and optionally improve or refactor it safely."
---

# Review, improve, or refactor code

Accept two independent inputs:

- `target=changes|<module|component|package|path|named concern>`
- `action=review|improve|refactor`, defaulting to `review`

`refactor` is a first-class scoped improvement intent. It preserves externally observable behavior unless the user explicitly authorizes a behavior change.

## Safety boundary

- Review is read-only.
- Improve or refactor requires explicit mutation intent and a narrow validated target.
- “Improve/refactor the whole codebase” does not authorize broad edits. Perform a bounded review, rank the highest-value candidates, and end `input-required` with one scope-selection prompt.
- Authorized edits stay inside the selected target plus directly required tests and configuration.

## Review dimensions

Assess correctness, maintainability, architecture, testability, security, and operational risk when relevant. Keep repository-standards and specification findings as separate axes. Prioritize findings by impact and confidence; actionable P0/P1 findings or failed required checks prohibit completion.

Prefer subtractive improvements before adding abstractions. Reduce reader load, require callers to migrate before legacy interfaces disappear, and ask whether the type system or module boundary can make the repaired invariant structural.

## Scoped improvement and refactoring

1. Establish behavior-preserving characterization tests when existing coverage is insufficient.
2. State the selected smell, boundary, invariant, or maintainability outcome.
3. Make the smallest coherent structural edits.
4. Re-run focused and relevant wider checks.
5. Report behavior preserved, files changed, and residual risks.

Domain modeling and module decomposition may inform the review as internal capabilities. They never become separate runs. Do not automatically invoke build, Git, or deployment.

## Completion report and next steps

This invocation has one root skill: `/qs-review-code`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-git-merge`, `/qs-code-build`, `/qs-code-debug`. Failure routes: `/qs-code-build`, `/qs-code-debug`, `/qs-flow-handoff`. Tailor every prompt to the completed work. When the remaining objective fits, the preferred prompt may use this catalog-approved composite workflow: $qs-specialists:qs-test-verify, then $qs-skills:qs-git-merge. Treat every step as a separate public root with its own completion report and authority boundary. Continue in this session only after a Complete result; stop on continuation-required, input-required, failed. This combined prompt does not grant commit, merge, push, release, deployment, installation, or other mutation authority unless the shared objective explicitly grants that exact action. This preserves each separate public root, must stop on a non-complete result, and does not add mutation authority.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-review-code
Outcome: Concise verified result.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-git-merge, $qs-skills:qs-code-build, $qs-skills:qs-code-debug, $qs-skills:qs-flow-handoff); Claude uses `/qs-git-merge`, `/qs-code-build`, `/qs-code-debug`, `/qs-flow-handoff`; Pi uses `/skill:qs-git-merge`, `/skill:qs-code-build`, `/skill:qs-code-debug`, `/skill:qs-flow-handoff`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
