---
name: qs-test-author
description: "Add or improve focused automated tests for already-established behavior."
disable-model-invocation: true
---

# Author tests for existing behavior

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../_shared/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-test-author` and an `Outcome:` naming the owning package (qs-specialists) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

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

Derive expected outcomes from the established contract independently of the implementation under test. When a test could agree with the same broken logic it exercises, run a known-bad control in an isolated fixture or reversible local mutation and confirm that the assertion fails for the intended defect. Retain legitimate absence, configuration and structural contract tests; test shape alone does not establish usefulness. Do not weaken an expectation to fit observed output.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-test-author`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-specialists:qs-test-verify` / `/qs-test-verify` / `/skill:qs-test-verify`, `$qs-skills:qs-review-code` / `/qs-review-code` / `/skill:qs-review-code`, `$qs-skills:qs-git-merge` / `/qs-git-merge` / `/skill:qs-git-merge`.
Recovery routes: `$qs-specialists:qs-test-verify` / `/qs-test-verify` / `/skill:qs-test-verify`, `$qs-skills:qs-review-code` / `/qs-review-code` / `/skill:qs-review-code`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
