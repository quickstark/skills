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

This invocation has one root skill: `/qs-test-author`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. A complete result has no next prompt. Continuation-required and input-required have exactly one copy-ready prompt. Failed has at most one concrete recovery prompt. Failed required checks or actionable P0/P1 findings prohibit `complete`.

When a distinct workflow is genuinely required, the catalog-approved continuation is `/qs-code-build`; tailor one prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, and the one continuation only when required. Full adds the evidence trail and alternatives but never extra prompts. Omit empty sections and routine successful detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-test-author
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Top next prompt: None — the requested work is complete. | one copy-ready prompt in a fenced `text` block

When continuation is required, write `Top next prompt:` and place the single complete prompt beneath it in its own fenced `text` block beginning with the exact Codex skill literal $qs-skills:qs-code-build. Claude uses `/qs-code-build`. The fence info string must be exactly `text` so the chat renders it as Plain text; never use `markdown`, `bash`, `json`, or another language. Put heuristic model/thinking guidance outside the fence in a muted blockquote beneath it. Never change the active model or reasoning setting.
