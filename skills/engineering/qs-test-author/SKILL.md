---
name: qs-test-author
description: "Add or improve focused automated tests for already-established behavior."
disable-model-invocation: true
---

# Author tests for existing behavior

Add or improve automated tests for one selected, already-established behavior. This is test-focused mutation: it does not implement features, repair defects, or redefine the product contract.

## Inputs and test strategy

Establish a narrow target and the behavior contract from explicit user statements, requirements, documentation, existing tests, or other verified project evidence. When the user does not require a test type, select the smallest stable observable seam supported by the repository instead of imposing a framework.

Unit, integration, contract, CLI, end-to-end, browser, snapshot, property-based, and regression tests are eligible when the project supports them or the target requires them.

## Mutation boundary

- Edit only tests, fixtures, test-only helpers, and narrowly required test configuration inside the selected target.
- Preserve unrelated and pre-existing worktree changes.
- The skill must not change product behavior, repair a defect, implement a feature, broadly migrate a test framework, or alter deployment infrastructure.
- Update snapshots or golden files only after verifying that the new expectation is the established contract.
- Do not create a production testability seam silently. When a meaningful test requires production code changes, stop and record the exact seam required for the separate `/qs-code-build` workflow.

## Behavior

1. Inspect repository instructions, dirty state, documented test commands, the active test framework, nearby coverage, and the selected behavior contract.
2. Confirm that the requested behavior already exists and that test authoring is the primary outcome.
3. Select the highest stable observable seam and the smallest meaningful success, boundary, and failure cases supported by evidence.
4. Add or improve focused tests without weakening assertions, deleting valuable coverage, or coupling tests to private implementation details.
5. Run focused tests regularly, then run the relevant wider validation once the test change is coherent.
6. Inspect the final diff for test-only scope, accidental snapshot churn, secrets, unrelated files, and misleading coverage claims.
7. Report the behavior covered, artifacts changed, checks actually run, pass/fail/skipped results, and anything that could not be verified.

## Failure handling

- Ask for one material decision before editing when the behavior contract is ambiguous.
- Do not manufacture a superficial test when no stable seam exists without production changes.
- When a new test exposes a reproducible product defect, preserve the evidence and failing check without fixing the product inside this command.
- Distinguish runner or environment failures from product failures.

A complete result requires a scoped test change, no unauthorized production mutation, passing required focused checks, and relevant wider validation actually run or honestly skipped with a reason.

Do not automatically invoke review, build, debug, Git, deployment, or another public skill.

## Completion report and next steps

This invocation has one root skill: `/qs-test-author`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Resolve governing specifications from explicit input, repository documentation, or a verified tracker. Every result includes `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Include `Work summary:` with known done, pending, and blocked totals when available, then outline up to three highest-priority verified tickets, specifications, issues, or grouped work items as `linked id — state — next action`. Group items only when they share the same state and next action. Write `None identified against linked specs` only after verifying completion against those specs.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit at most one copy-ready next-work prompt, and only when a distinct actionable item remains. Omit the prompt when the status is `complete` and there is no verified remaining work. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: `/qs-test-verify`, `/qs-review-code`, `/qs-git-merge`. Failure routes: `/qs-test-verify`, `/qs-review-code`, `/qs-flow-handoff`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, the work summary when applicable, and the optional next-work prompt. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-test-author
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Work summary: verified totals and up to three linked items with state and next action
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Label the optional continuation `Next work prompt:`. When present, put it in one fenced `text` block beginning with its exact Codex literal ($qs-specialists:qs-test-verify, $qs-skills:qs-review-code, $qs-skills:qs-git-merge, $qs-skills:qs-flow-handoff); Claude uses `/qs-test-verify`, `/qs-review-code`, `/qs-git-merge`, `/qs-flow-handoff`; Pi uses `/skill:qs-test-verify`, `/skill:qs-review-code`, `/skill:qs-git-merge`, `/skill:qs-flow-handoff`. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. When absent, write `Next work prompt: None — no follow-on needed.` The fenced prompt is copy-ready only; plain skill Markdown cannot request or guarantee an Add action. Keep model guidance outside the fence and never change the active model or reasoning setting.
