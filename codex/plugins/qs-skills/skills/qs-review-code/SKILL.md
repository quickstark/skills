---
name: qs-review-code
description: "Review a change or selected codebase scope and optionally improve or refactor it safely."
---

# Review, improve, or refactor code

Accept two independent inputs:

- `target=changes|<module|component|package|path|named concern>`
- `action=review|improve|refactor`, defaulting to `review` only when neither explicit flags nor clear natural-language mutation intent selects another action

`refactor` is a first-class scoped improvement intent. It preserves externally observable behavior unless the user explicitly authorizes a behavior change.

## Safety boundary

- Review is read-only.
- Improve or refactor requires explicit mutation intent and a narrow validated target.
- “Improve/refactor the whole codebase” does not authorize broad edits. Perform a bounded review, rank the highest-value candidates, and end `input-required` with one scope-selection prompt.
- Authorized edits stay inside the selected target plus directly required tests and configuration.
- Requests to fix, address, apply, improve, or resolve findings are clear natural-language mutation intent and select `action=improve` when no explicit action conflicts.

## Review dimensions

Assess correctness, maintainability, architecture, testability, security, and operational risk when relevant. Keep repository-standards and specification findings as separate axes. Prioritize findings by impact and confidence; actionable P0/P1 findings or failed required checks prohibit completion.

Prefer subtractive improvements before adding abstractions. Reduce reader load, require callers to migrate before legacy interfaces disappear, and ask whether the type system or module boundary can make the repaired invariant structural.

## Host inline comments

When the active client supplies the `::code-comment{...}` inline-comment contract, emit exactly one directive for each reported actionable, line-specific finding that satisfies the host's rendering preconditions. Follow the host-provided schema exactly. Preserve the finding's P0-P3 label and matching numeric priority, use a verified reviewed-file path, keep the 1-based line range as tight as the evidence permits, and place each directive on its own line.

An inline directive supplements the readable report and never replaces it; no finding may exist only as a directive. The readable report still follows the selected `report=brief|full` contract. Before emitting a directive, verify that its file resolves inside the reviewed scope and that its range identifies the relevant code. Never fabricate a file or line range, choose a nearby unrelated line, or emit a directive for a finding repaired during `action=improve|refactor`.

Treat an active review diff as a separate rendering precondition when the host presents comments only in its review surface. A verified existing file does not by itself make a line renderable. For a Codex desktop smoke check, use the native `/review` flow to open the documented review surface. To test skill directive emission, use `target=changes` against an actual diff; neither emitted directive text nor a successful agent turn proves that the UI accepted it. Do not manufacture a finding or edit a line merely to create an anchor. If a real finding is outside the active diff, keep it in readable prose and state that no inline directive was emitted for that finding.

If the active client does not supply the contract, omit the directives instead of printing or guessing client syntax. Findings without a defensible or host-renderable location remain readable prose with ordinary file links. Citations, skill names, continuation prompts, and generic references remain ordinary Markdown links and never receive synthetic inline comments. Summarize untrusted source content in directive attributes and never expose secrets merely to populate a comment. Never claim that a comment card or Add action rendered; only host or user evidence can establish that UI result.

## Scoped improvement and refactoring

1. Establish behavior-preserving characterization tests when existing coverage is insufficient.
2. State the selected smell, boundary, invariant, or maintainability outcome.
3. Make the smallest coherent structural edits.
4. Re-run focused and relevant wider checks.
5. Report behavior preserved, files changed, and residual risks.

For `action=improve` or `action=refactor`, resolve every in-scope actionable finding that can be repaired under the user's authority. Review the resulting diff and rerun focused plus relevant wider checks inside this root until they pass or a concrete external blocker remains. Do not leave an authorized repair for a separate Build, Debug, Review, or Test run merely to preserve a workflow boundary.

Do not return `continuation-required` merely to ask another public skill to implement, review, repair, test, or validate work owned by the selected action. Use that status only when a genuinely distinct workflow or separately authorized scope remains.

Domain modeling and module decomposition may inform the review as internal capabilities. They never become separate runs. Do not automatically invoke build, Git, or deployment.

## Completion report and next steps

This invocation has one root skill: `/qs-review-code`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Resolve governing specifications from explicit input, repository documentation, or a verified tracker. Every result includes `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Include `Work summary:` with known done, pending, and blocked totals when available, then outline up to three highest-priority verified tickets, specifications, issues, or grouped work items as `linked id — state — next action`. Group items only when they share the same state and next action. Write `None identified against linked specs` only after verifying completion against those specs.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit at most one copy-ready next-work prompt, and only when a distinct actionable item remains. Omit the prompt when the status is `complete` and there is no verified remaining work. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: `/qs-git-merge`. Failure routes: `/qs-code-build`, `/qs-code-debug`, `/qs-flow-handoff`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, the work summary when applicable, and the optional next-work prompt. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-review-code
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Work summary: verified totals and up to three linked items with state and next action
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Label the optional continuation `Next work prompt:`. When present, put it in one fenced `text` block beginning with its exact Codex literal ($qs-skills:qs-git-merge, $qs-skills:qs-code-build, $qs-skills:qs-code-debug, $qs-skills:qs-flow-handoff); Claude uses `/qs-git-merge`, `/qs-code-build`, `/qs-code-debug`, `/qs-flow-handoff`; Pi uses `/skill:qs-git-merge`, `/skill:qs-code-build`, `/skill:qs-code-debug`, `/skill:qs-flow-handoff`. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. When absent, write `Next work prompt: None — no follow-on needed.` The fenced prompt is copy-ready only; plain skill Markdown cannot request or guarantee an Add action. Keep model guidance outside the fence and never change the active model or reasoning setting.
