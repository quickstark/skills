# Specification: QuickStark testing specialists

**Status:** Implemented
**Release boundary:** Additive QuickStark v3 minor release
**Decision sources:** User-confirmed two-skill split, `CONTEXT.md`, ADR 0001, and the v3 skill-run contract

> Continuation cardinality is superseded by ADR 0003, and hosted-output acceptance is superseded by the direct-chat completion contract. Testing ownership, package isolation, and TDD boundaries remain active.

## Problem

QuickStark has no public command whose primary outcome is testing existing software. Testing currently appears only as a supporting technique:

- `qs-code-build` chooses an implementation validation strategy and may use the internal TDD loop.
- `qs-code-debug` adds regression coverage while diagnosing and repairing a defect.
- `qs-review-code` may add characterization coverage before a scoped improvement or refactor.

Those workflows should retain their existing responsibilities. They do not cleanly serve either of these independent user intents:

1. Add or improve automated tests for behavior that already exists, without implementing a feature or repairing a defect.
2. Execute a selected verification matrix and report what actually passed, failed, or was skipped, without changing or fixing the software.

Combining both intents in one command would mix mutation authority, completion criteria, failure handling, and readout signals. Restoring the retired `qs-test-tdd` command would also violate the v3 decision that TDD remains an internal implementation capability.

## Governing decisions

1. Add two promoted public commands: `qs-test-author` and `qs-test-verify`.
2. Ship both commands in the optional `qs-specialists` package. The default `qs-skills` package remains exactly twelve commands; the specialist package changes from five to seven commands.
3. Keep `qs-test-tdd` retired as a public name. The internal `tdd-loop` remains owned only by `qs-code-build`.
4. Make both commands explicit-only. Test authoring mutates files, and verification may execute costly or environment-sensitive commands; neither scope should be inferred silently.
5. Give each command one root run, one purpose-specific readout, and no automatic public-skill hop.
6. Treat this as an additive v3 minor release. Do not publish, tag, or deploy it as part of specification work.

## Public command contracts

### `qs-test-author`

**Primary outcome:** Add or improve automated tests for selected, already-established behavior.

**Canonical location:** `skills/engineering/qs-test-author/`

**Display metadata:**

- Display name: `QS Test: Author`
- Short description: `Add focused tests for existing behavior`
- Default prompt: `Use $qs-test-author to add or improve focused automated tests for this existing behavior.`
- Catalog prompt: `add or improve focused automated tests for this existing behavior`
- Upstream name: `null`; this is a new QuickStark command, not an alias of a v2 or upstream skill.

**Inputs:**

- A narrow target: changed behavior, module, component, package, path, command, endpoint, or named contract.
- The behavior contract to preserve, derived from requirements, existing documentation, existing tests, or explicit user statements.
- Optional requested test types. When omitted, select from repository evidence rather than imposing a framework.
- Normal `effort=quick|standard|deep` and `report=brief|full` inputs.

**Supported test types:** Unit, integration, contract, CLI, end-to-end, browser, snapshot, property-based, and regression tests are eligible when the repository already supports them or the selected target clearly requires them. The skill must choose the smallest stable seam that proves the named behavior.

**Mutation boundary:**

- May edit tests, fixtures, test-only helpers, and narrowly required test configuration inside the selected target.
- Must preserve unrelated worktree changes.
- Must not change product behavior, repair a defect, implement a feature, broadly migrate a test framework, alter deployment infrastructure, or update snapshots/golden files without verifying that the new expectation is the established contract.
- Must not create a production testability seam silently. If production code must change before a meaningful test can be written, end without that mutation and carry the requirement to the approved `qs-code-build` continuation.

**Behavior:**

1. Inspect repository instructions, dirty state, documented test commands, test framework, nearby coverage, and the selected behavior contract.
2. Confirm that the requested behavior already exists and that test authoring—not feature implementation or defect repair—is the primary outcome.
3. Select the highest stable observable seam and the smallest meaningful set of cases, including important success, boundary, and failure behavior supported by evidence.
4. Add or improve focused tests without weakening assertions, deleting valuable coverage, or overfitting to private implementation details.
5. Run the focused tests regularly, then the relevant wider validation once the test change is coherent.
6. Inspect the final diff for test-only scope, accidental snapshot churn, secrets, unrelated files, and misleading coverage claims.
7. Report the behavior covered, test artifacts changed, exact checks run, pass/fail/skipped results, and any behavior that could not be verified.

**Failure handling:**

- If the behavior contract is ambiguous, request one material decision before editing.
- If no stable seam exists without production changes, stop with the required seam and a `qs-code-build` continuation; do not manufacture a superficial test.
- If a new test exposes a reproducible product defect, preserve the observed evidence, do not fix it inside this command, and do not report completion while its required check fails.
- If the runner or environment is unavailable, distinguish infrastructure failure from product failure and report the exact blocked check.

**Completion:** A complete run has a scoped test change, no unauthorized production change, passing required focused validation, relevant wider validation actually run or honestly skipped with reason, and no actionable P0/P1 finding.

**Approved continuation:** `qs-code-build`, only when a production testability seam or other explicit implementation change is required. Successful test authoring completes with no prompt.

### `qs-test-verify`

**Primary outcome:** Execute and report an existing verification matrix without changing or repairing the software.

**Canonical location:** `skills/engineering/qs-test-verify/`

**Display metadata:**

- Display name: `QS Test: Verify`
- Short description: `Run and report selected software verification`
- Default prompt: `Use $qs-test-verify to run and report the selected test suites and environments without changing the software.`
- Catalog prompt: `run and report the selected test suites and environments without changing the software`
- Upstream name: `null`; this is a new QuickStark command, not an alias of a v2 or upstream skill.

**Inputs:**

- A verification target: change set, component, package, application, suite, command, or named behavior.
- An optional matrix of suites, commands, platforms, browsers, services, or environments.
- Optional acceptance requirements such as mandatory suites, allowed skips, retry policy, or required artifacts.
- Normal `effort=quick|standard|deep` and `report=brief|full` inputs.

**Default matrix selection:** When the user does not provide a matrix, derive the smallest credible matrix from repository instructions, package scripts, CI configuration, changed paths, and the selected target. Do not claim unsupported platforms or environments were tested.

**Read-only boundary:**

- The skill does not edit source, tests, snapshots, configuration, or expectations and does not fix failures.
- Test processes may create declared ephemeral outputs such as coverage, screenshots, traces, logs, or temporary databases. Detect material worktree changes, distinguish pre-existing files from run-created artifacts, and report rather than absorb unrelated changes.
- Do not update snapshots, accept golden files, install dependencies, provision infrastructure, deploy software, or access production merely to make verification pass.
- External services, paid resources, privileged devices, production-like environments, and destructive test commands require explicit authority and available task-relevant credentials.

**Behavior:**

1. Inspect repository instructions, dirty state, documented verification commands, CI configuration, available runtimes, and the selected target.
2. Resolve the requested or evidence-derived matrix before execution, identifying required, optional, and unavailable checks.
3. Run non-destructive focused checks first. Broaden to the agreed matrix only when prerequisites and authority are satisfied.
4. Record each suite/environment as passed, failed, skipped, or blocked with the actual command or observable interface, duration only when measured, and concise failure evidence.
5. Do not rerun failures merely to obtain a pass. A bounded retry is allowed only for an identified transient condition and both attempts must remain visible.
6. Leave diagnosis and repair outside this run. Summarize the smallest reliable reproducer or failure boundary supported by the results.
7. Inspect post-run state for source mutations, unexpected artifacts, secrets, and incomplete cleanup before normalizing the outcome.

**Failure handling:**

- A failed required check prohibits `complete`.
- Unsupported or unavailable environments are `skipped` only when the acceptance contract permits that; otherwise they are blocked or failed.
- Product failures remain unfixed and may continue to `qs-code-debug`.
- Infrastructure, credential, permission, or runner failures are reported as such and must not be mislabeled as product defects.
- Secrets, full sensitive logs, and credentials never enter the readout.

**Completion:** A complete run executes every required feasible check in the agreed matrix, records honest pass/fail/skipped evidence, leaves no unauthorized source mutation, and satisfies the stated acceptance requirements.

**Approved continuation:** `qs-code-debug`, only when an observed reproducible failure requires diagnosis and repair. A passing verification run completes with no prompt.

## Boundary with existing workflows

| User intent | Owning command | Boundary |
| --- | --- | --- |
| Implement new or changed product behavior with appropriate tests | `qs-code-build` | Retains the internal TDD decision and all product mutation. |
| Add or improve tests for already-established behavior | `qs-test-author` | Test-focused mutation only; no feature or defect repair. |
| Execute an agreed test/environment matrix and report results | `qs-test-verify` | Read-only verification; no source or expectation changes. |
| Diagnose and repair a reproducible failure | `qs-code-debug` | Owns causal diagnosis, repair, and regression protection. |
| Review test quality, correctness, or testability | `qs-review-code` | Review is read-only unless a narrow improve/refactor action is explicitly selected. |
| Validate and execute a documented deployment or release | `qs-deploy-release` | Owns release gates, deployment, health, and rollback readiness. |

Neither new command invokes the internal TDD capability. A user asking to implement behavior test-first still routes to `qs-code-build`, and `qs-test-tdd` remains absent from public manifests, aliases, folders, and routing.

## Catalog and package model

The current catalog builds all known skill metadata from `LEGACY_V2_SKILLS`. New v3-only commands must not be inserted into that fixed migration inventory, because doing so would falsely claim they existed in v2 and would corrupt disposition coverage.

Refactor the catalog data model as follows:

1. Keep the existing v2 inventory immutable for migration validation.
2. Add a separate v3-only definition collection containing `qs-test-author` and `qs-test-verify`.
3. Build the active skill-definition/readout maps from the union of legacy definitions and v3-only definitions.
4. Continue building v2 dispositions only from the fixed v2 inventory.
5. Add the new commands to `V3_SPECIALIST_COMMAND_DEFINITIONS` after `qs-code-document`:

   | Position | Command | Group | Approved continuation |
   | ---: | --- | --- | --- |
   | 130 | `qs-plan-research` | `plan` | `qs-plan-spec` |
   | 140 | `qs-design-prototype` | `design` | `qs-plan-spec` |
   | 150 | `qs-code-document` | `code` | `qs-review-code` |
   | 160 | `qs-test-author` | `test` | `qs-code-build` |
   | 170 | `qs-test-verify` | `test` | `qs-code-debug` |
   | 180 | `qs-learn-teach` | `learn` | `qs-plan-research` |
   | 190 | `qs-skill-write` | `skill` | `qs-review-code` |

6. Preserve core lifecycle positions 10–120. The full promoted catalog now has 19 commands with unique positions 10–190.
7. Mark both commands explicit-only in canonical frontmatter and Codex policy metadata.
8. Assign both commands to exactly one projection: `qs-specialists`.

## Readout profiles

Add purpose-specific profiles rather than reusing the retired TDD profile.

### `qs-test-author`

- Title: `Test coverage change`
- Primary signal: `Show the behavior covered and actual validation results`
- Visual cue: `checks`
- Section order: outputs, checks, decisions, findings
- Labels: outputs `Test artifacts`; checks `Test validation`; decisions `Coverage decisions`; findings `Observed gaps`

### `qs-test-verify`

- Title: `Verification matrix`
- Primary signal: `Show actual pass, fail, skipped, and blocked results by target`
- Visual cue: `matrix`
- Section order: checks, findings, outputs, decisions
- Labels: checks `Verification results`; findings `Observed failures`; outputs `Test artifacts`; decisions `Matrix decisions`

Only tests and environments actually executed may appear as passed. Required failures and actionable P0/P1 findings prohibit a complete result. Internal helpers and test processes remain evidence inside the root run and never appear in `skillsUsed`.

## Implementation boundaries and dependency order

1. **Record the architecture decision.** Add ADR 0002, preserving ADR 0001 as historical context while superseding only its exact five-specialist membership decision. Confirm that core remains twelve and TDD remains internal.
2. **Separate active definitions from the v2 migration inventory.** Refactor `scripts/qs-skill-catalog.mjs` before adding the new names, with regression tests proving the fixed v2 map is unchanged.
3. **Add catalog membership and report profiles.** Add metadata, explicit invocation policy, positions, continuations, model guidance, and the two readout profiles.
4. **Author canonical skill sources.** Add each `SKILL.md` and matching `agents/openai.yaml` under `skills/engineering/`; generate the shared completion sections through the repository script rather than copying stale boilerplate.
5. **Update discovery and authoritative documentation.** Update `qs-help`, root and engineering indexes, `CONTEXT.md`, `README.md`, architecture, migration guidance, report assessment, and all exact-count language from five to seven specialists.
6. **Generate package projections.** Run the canonical synchronizer so both new commands appear in Claude and Codex `qs-specialists` outputs and remain absent from core outputs.
7. **Add behavioral and presentation tests.** Cover routing, mutation boundaries, result truthfulness, generated parity, and profile rendering before release metadata is changed.
8. **Version coherently.** Add a minor changeset and keep `package.json`, lockfile, both Claude manifests, and both Codex manifests on one version through the normal version workflow.
9. **Run required validation.** Execute synchronization, Codex checks, the full test suite, and both Claude plugin validations when the CLI is available.

Generated Claude specialist snapshots and Codex package trees must never be edited independently.

## Verification plan

### Catalog and migration

- Assert exactly 12 core commands, exactly 7 specialist commands, exactly 19 promoted commands, and exactly 4 internal capabilities.
- Assert the specialist order and lifecycle positions shown above.
- Assert both new commands are explicit-only, belong only to `qs-specialists`, and have exactly one approved continuation.
- Assert the fixed v2 inventory and every existing v2 disposition remain unchanged.
- Assert `qs-test-tdd` is still absent from installable v3 directories, manifests, aliases, router entries, and promoted command lists.

### `qs-test-author` behavior

- A scoped existing behavior with a stable seam adds focused tests and changes only allowed test artifacts.
- An ambiguous behavior contract requests one decision before mutation.
- A request to implement new behavior routes to `qs-code-build` rather than being absorbed.
- A missing production testability seam causes no production edit and carries the exact required seam to `qs-code-build`.
- Snapshot or golden updates require evidence that the new expectation is the established behavior.
- Focused and relevant wider checks report actual pass, fail, and skipped results; a failed required check cannot complete.
- Pre-existing dirty files and unrelated test changes remain untouched and excluded from run-owned output claims.

### `qs-test-verify` behavior

- A repository-derived local matrix runs the documented focused and wider commands and produces an honest result table.
- An explicitly selected multi-environment matrix records each environment independently and never implies an unavailable platform ran.
- A required failure produces a non-complete result and no source fix.
- A reproducible product failure carries evidence to the single `qs-code-debug` continuation.
- A transient retry remains bounded and exposes both attempts.
- Missing credentials, permissions, runners, devices, or external services are classified without leaking sensitive values.
- Post-run source mutations or unexpected artifacts are detected and reported; pre-existing changes are not attributed to the run.

### Generation, documentation, and reports

- Canonical sources, root/bucket indexes, help output, generated concise docs, Claude manifests, Codex manifests, and both specialist snapshots agree on the same seven specialist commands.
- Core package smoke tests pass without specialist assets.
- Specialist package smoke tests can load each new command independently.
- Each profile renders only actual normalized evidence and obeys brief/full omission rules.
- Complete results emit no prompt; continuation-required and input-required results emit exactly one approved prompt.
- Re-running generation without source changes produces no diff.
- Representative runs for both new skills publish independently accepted authenticated hosted readouts.

### Required commands

```bash
npm run sync:codex
npm run check:codex
npm test
claude plugin validate . --strict
claude plugin validate ./packages/qs-specialists --strict
```

Run the Claude validations only when the CLI is available, and report their absence honestly.

## Acceptance criteria

1. `/qs-test-author` and `/qs-test-verify` are separately invocable promoted commands in the optional specialist package for both Claude and Codex.
2. `/qs-test-author` adds or improves focused tests for established behavior without unauthorized production changes.
3. `/qs-test-verify` executes and reports an agreed verification matrix without editing or repairing the software.
4. New-feature TDD remains internal to `/qs-code-build`; `/qs-test-tdd` is not restored in any public or compatibility surface.
5. The default core remains exactly twelve commands and operates without specialist assets.
6. The optional specialist package contains exactly seven commands in catalog-defined order.
7. The v2 migration inventory remains fixed and does not classify either new command as a v2 disposition.
8. Both commands are explicit-only, have distinct report profiles, and record only the root command in `skillsUsed`.
9. Failed required checks and actionable P0/P1 findings cannot be reported as complete.
10. Source, manifests, indexes, docs, generated packages, versions, and tests remain synchronized.
11. Required repository checks pass, with unavailable Claude validation reported rather than fabricated.
12. No implementation, release, Git publication, or deployment occurs during this specification run.

## Security, compatibility, and rollout

- Treat repository test commands as executable project code. Inspect documented commands and prerequisites before running them.
- Never place credentials, sensitive environment values, production data, full private logs, or secret-bearing paths in a test artifact or readout.
- Require explicit authority for production, paid, privileged-device, or destructive verification.
- Preserve the existing hosted-report authentication, project authorization, immutable storage, and external-skill boundaries.
- Preserve Matt Pocock's MIT license and attribution; identify both new commands as QuickStark additions with no upstream source name.
- Document that installed plugin caches require refresh or a new task after upgrading.
- Release core and specialist manifests atomically on the same version even though the core command count does not change.

## Out of scope

- Implementing either skill during this specification run.
- Restoring, aliasing, wrapping, or routing through `qs-test-tdd`.
- Moving TDD out of `qs-code-build`.
- Building a new test framework, CI service, browser farm, device lab, environment provisioner, coverage platform, or dashboard.
- Automatically fixing product failures found by verification.
- Broad production refactors solely to make testing easier.
- Creating issue-tracker tickets; none were requested for this specification.
- Publishing a commit, pull request, package, tag, release, or deployment.

## Open questions

None block implementation. Test types and environments are intentionally selected per invocation from explicit user scope and repository evidence rather than fixed globally.
