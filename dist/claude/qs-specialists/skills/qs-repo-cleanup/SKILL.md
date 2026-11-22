---
name: qs-repo-cleanup
description: "Audit or clean verified repository clutter while preserving behavior, user work, and historical evidence."
disable-model-invocation: true
---

# Audit and clean repository hygiene

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../../capabilities/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-repo-cleanup` and an `Outcome:` naming the owning package (qs-specialists) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Own one bounded hygiene outcome across unused code/files/assets/dependencies, disposable artifacts, ignore rules, stale documentation, and demonstrably obsolete tests/fixtures. Account for every applicable category; no deletion quota applies. A supported no-change result is valid.

## Inputs and authority

- `target=<repository-root or selected paths>` defaults to the verified current repository. Resolve ambiguous targets before editing. Selecting one package does not authorize edits to another; read-only reference discovery may span the repository.
- `action=audit|clean`: explicit flags win, then clear natural-language intent, then `audit`. “Clean up this repo” selects clean; bare invocation or “review what can be cleaned” selects audit. Effort controls evidence depth, never permission.
- Audit inspects and proposes without changing target files, installing tools, or regenerating artifacts. Checks that write outputs require an authorized disposable environment; otherwise report them unperformed.
- Clean owns supported in-scope hygiene, its internal review, repair, and validation. Present a compact plan and continue under existing authority; do not request repeated approval for safe batches already authorized.

No refactoring: do not simplify live code, consolidate duplicates, remove live wrappers, rename APIs, reorganize live modules, reformat broadly, change error handling, or change intended behavior. No dependency upgrades/replacements, package-manager migrations, Git history rewriting, branch/worktree removal, global cache cleanup, hook installation, commits, installation, pushes, PR creation, or publication. A request mixing these outcomes does not expand this root; complete independent hygiene and identify the separate concern without invoking another skill.

## Preservation rules

Protect pre-existing staged/unstaged changes, untracked user work, credentials, local databases/data, migrations, lockfiles, intentional generated deliverables, live tests, and historical decisions/provenance/verification evidence. Never delete credentials or local data to cure an exposure finding. Report affected paths with values redacted; do not copy secrets into chat, reports, backups, or archives. Existing project exposure checks do not certify a repository safe for release.

A filename, extension, age, size, ignored status, analyzer warning, or missing text reference is only a discovery signal. None proves an item disposable. Retain uncertainty. Do not move uncertain content into an archive as a substitute for proving a move safe.

Resolve canonical paths and contain all mutation within the selected root. Never follow symlinks outside it or traverse Git internals, nested repositories, or submodules as ordinary directories. A separately selected nested target needs its own baseline. Do not use broad deletion globs, `git clean`, resets, automatic stashes, safety commits, or whole-file restores that discard unrelated work.

Bind each mutation to a successful current-state guard in the same operation, or explicitly check the guard's successful exit before issuing the edit. A failed, missing, or ambiguous guard stops that mutation, including when failure looks like a tooling error. Do not execute a later edit after a failed guard or treat a later preservation check as retroactive authorization. Re-establish the exact candidate state before trying again. Compare content hashes and exact state observations; do not round nanosecond timestamps through a numeric serialization boundary and mistake the result for trustworthy state evidence.

If inspection already proves an operation will violate scope, stop before executing it. In particular, do not run a package-manager command known to upgrade unrelated dependencies merely to demonstrate the failure and undo it afterward.

## Workflow

1. **Establish evidence.** Read governing instructions, manifests, package/workspace boundaries, generation owners, and check commands. Capture revision, staged/unstaged/untracked state, relevant ignored paths, and baseline check results. Record pre-existing failures separately. Exclude dirty files from mutation unless their existing edits were specifically included and can be preserved losslessly; continue independent safe work.
2. **Inventory.** For each exact path/symbol or coherent group record category, package owner, current state, proposed operation, positive retirement/regeneration evidence, applicable reference checks, recovery method, required verification, and disposition. Use eligible, retained, needs decision, blocked, removed/updated, or reverted. Keep this in the run; do not generate mandatory report/archive files.
3. **Prove candidates.** Inspect runtime/build entry points, framework discovery, dynamic loading/reflection/registration, package exports, CLI scripts, CI/deploy configuration, templates, docs, and fixtures as applicable. No internal callers does not prove a public interface unused. Retain published/external contracts without independent retirement evidence.
4. **Plan batches.** Rank coherent hygiene batches by evidence, risk, and dependencies. Audit stops at inventory/plan. Clean proceeds with authorized batches. Revalidate paths and user-change state immediately before each mutation; new edits invalidate eligibility. Skip that candidate and continue unrelated safe work.
5. **Apply category rules below.** Delete isolated proven-unused items plus directly obsolete private references only. A live control-flow or structural rewrite is a separate concern. Pristine tracked files may use the verified Git baseline for recovery; untracked/ignored output needs demonstrated regeneration, not an assumed Git backup.
6. **Verify each batch.** Run the narrowest meaningful checks and relevant wider checks for the combined diff. Use focused characterization coverage only if necessary to establish a deletion invariant; no test-backfill campaign. Inspect the resulting diff for live-behavior changes, lost user work, exposed values, unrelated resolution churn, and scope drift.
7. **Recover and finish.** Repair cleanup-caused failures inside hygiene scope or reverse only the batch's own edits without discarding concurrent/pre-existing changes. Recheck. Stop that path if lossless recovery is unavailable. Do not repair unrelated product bugs. Missing tools, denied operations, unavailable environments, skipped checks, and baseline failures stay explicit. Finish all safe authorized work before reporting a concrete blocker.

## Category rules and checks

| Category | Evidence and permitted operation | Verification |
| --- | --- | --- |
| Private code, scripts, assets | Prove retirement or non-use across applicable runtime, consumer, build, and discovery surfaces. Delete only the unused item and now-obsolete private references. Preserve public/dynamic entry points when uncertain. | Relevant tests, static analysis, build, package/asset checks, and diff inspection. |
| Dependencies | Check direct runtime, scripts, config, CI, plugin, optional/peer, and workspace use. Remove only verified-unused direct dependencies through the existing package manager. | Keep the lockfile; inspect the package-manager delta for unchanged unrelated versions and format. Stop or reverse unexpected upgrades/churn. Use relevant tests/build and frozen install/equivalent in a disposable environment when available. Never delete, arbitrarily regenerate, or manually forge a lockfile. |
| Artifacts/caches/clutter | Identify the producer and disposal/regeneration evidence, including OS/editor metadata. Protect intentionally committed generated deliverables and unique untracked content. Directory names such as `dist`, `lib`, or `build` are not permission. | Demonstrate regeneration where needed and account for rebuilt outputs. Do not claim lasting disk savings if validation recreates the cache. |
| Ignore rules | Make narrow changes matching actual disposable output or private local state; preserve existing intent and safe examples. | Check positive and negative paths, nested paths, and exceptions. Ignore rules do not untrack already-committed files. |
| Documentation/history | Correct factual drift and broken references against actual behavior. Archive only demonstrably superseded material, preserve historical content, and update incoming links. | Check links/anchors and affected examples. Preserve ADRs/specifications/provenance/acceptance records; no wholesale tone rewrite or filename-based archival. |
| Tests/fixtures | Establish that covered behavior or its feature is already retired and no live contract/scenario still depends on the coverage. | Check surviving tests and discovery. Failing, flaky, skipped, slow, old, or apparently duplicate tests are not obsolete by those properties. Never delete tests or weaken assertions to make checks pass. |

## Result and stopping rules

Report applicable-category coverage, exact changes with reasons, retained/deferred candidates, baseline versus new failures, verification evidence, and material risks. No automatic continuation or external result artifact. Use the shared completion contract below, including `Specs: Not located` where appropriate.

Audit may complete with a supported inventory and plan that retains ordinary uncertain candidates. Clean completes when supported authorized batches and required checks are finished. A defensible retention decision is not unfinished removal. Missing evidence needed for the requested outcome, failed required checks, or actionable P0/P1 findings prohibits complete. Use input-required for a material decision/missing input, failed for unsuccessful execution or validation, and continuation-required only for a distinct workflow required by the larger goal.

Code refactoring belongs to a separately selected `qs-review-code` target; worktree removal belongs to `qs-worktree-cleanup`. Do not hand off this root's authorized cleanup repair, review, or testing merely to preserve a workflow boundary. Repeat runs should introduce no unnecessary churn.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-repo-cleanup`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-review-code` / `/qs-review-code` / `/skill:qs-review-code`, `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
Recovery routes: `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`, `$qs-skills:qs-code-debug` / `/qs-code-debug` / `/skill:qs-code-debug`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
