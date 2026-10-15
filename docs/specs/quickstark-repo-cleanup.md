# Specification: QuickStark repository cleanup specialist

**Status:** Local implementation and AC01–AC20 verified; original root Claude warning resolved with repository guidance preserved
**Date:** 2026-10-14
**Decision source:** User-confirmed hygiene-only scope in the accompanying planning conversation
**Repository baseline:** `6bed58bee404ce51c82652621bce5a6465adff09`, QuickStark 4.0.2
**Delivery boundary:** Originally specification only; later requests authorize implementation, AC01–AC20 validation, release preparation, and updating this server's Codex and Pi installations. The user selected cleanup in **4.2.0** after discovering that published 4.1.0 contains Codex-home targeting, then explicitly authorized commit, push, tag, publication and completion of the server update. Authorization is not evidence of successful publication or rollout. See the [implementation validation record](../validation/repo-cleanup.md).

## Problem and outcome

Repository maintainers need one bounded workflow that discovers and removes verified repository clutter across code, assets, dependencies, generated artifacts, documentation, and obsolete tests. Existing commands cover selected code refactoring, documentation authoring, testing, and worktree removal, but none owns this cross-category hygiene outcome.

Add `qs-repo-cleanup` to the optional `qs-specialists` package. It inventories the selected repository scope, establishes removal evidence, performs authorized hygiene in small coherent batches, verifies preserved behavior, and accounts for retained or unresolved candidates. It must also support a read-only audit.

Comprehensive means every applicable hygiene category is accounted for, not that every suspicious item is removed. There is no deletion, line-count, disk-space, or percentage-reduction quota. A verified no-change result is valid.

## Governing decisions and evidence

- The user selected **repository hygiene only; no refactoring**. Unused-code deletion is included; simplification of live code is excluded.
- Existing [code review](../../skills/engineering/qs-review-code/SKILL.md) retains ownership of selected improvement/refactoring targets. Existing [worktree cleanup](../../skills/engineering/qs-worktree-cleanup/SKILL.md) retains its exact-target removal boundary. Neither is invoked automatically.
- At the recorded baseline, the [catalog](../../scripts/qs-skill-catalog.mjs) defined 12 core and 8 specialist commands, and the [registry](../../scripts/skill-collection-registry.mjs) exposed 38 active commands across six packages. This addition yields 9 specialists and 39 active commands; it does not add a package or alter existing identities.
- [AGENTS.md](../../AGENTS.md), [contributing guidance](../contributing.md), and the [run contract](../skill-run-contract.md) govern source ownership, generated projections, reporting, and validation. Current policy takes precedence over historical counts and superseded reporting requirements in older specifications.
- The existing [consolidation specification](./quickstark-v3-skill-consolidation.md) supplies the one-root and optional-package boundaries. This specification authorizes the additive membership change only when implementation is requested.

### Reviewed influences

These sources were inspected during clarification. Their mutable URLs identify the reviewed material; they are not pinned adoption receipts. Implementation must capture immutable revisions before adapting text.

| Source | Retain | Reject or narrow |
| --- | --- | --- |
| [Cortex repo-cleanup](https://github.com/NickCrew/Claude-Cortex/tree/main/skills/repo-cleanup) | Coverage of code, dependencies, docs, tests, and historical artifacts; conditional references. | Age/import-count removal heuristics, blanket artifact deletion, dependency upgrades, lockfile regeneration as cleanup, mandatory archive/report proliferation. |
| [repo-hygiene](https://github.com/gg-mo/repo-hygiene/blob/main/skills/cleaning-existing-codebase/SKILL.md) | Survey, baseline, ranked phases, bounded changes. | Architecture/docstring sweeps, mandatory PR-per-phase and repeated approval pauses regardless of existing authority. |
| [Wunder cleaner](https://github.com/wundercorp/cleaner-skill) | Candidate inventory, dry-run behavior, exposure checks, targeted ignore maintenance. | Filename-based deletion of credentials, databases, configuration, certificates, or backups; automatic hooks; assuming every task is public-release preparation. Do not import its deletion script. |
| [ai-slop-cleaner](https://github.com/Yeachan-Heo/oh-my-claudecode/blob/main/skills/ai-slop-cleaner/SKILL.md) | Behavior-preserving validation, small reversible passes, concise evidence. | Refactoring, deduplication, wrapper removal from live paths, UI aesthetic preferences, and OMC/Ralph integration. |

## Scope and exclusions

Included categories:

1. Verified-unused private code, files, scripts, and assets.
2. Verified-unused direct dependencies, with package-manager-consistent manifest and lockfile updates.
3. Proven regenerable artifacts, caches, and OS/editor clutter inside the selected repository.
4. Narrow ignore-rule corrections that match actual project behavior.
5. Stale documentation, broken references, and superseded material whose historical value is preserved.
6. Demonstrably obsolete tests and fixtures whose behavior or owning feature has already been retired.

Excluded: simplification, deduplication, formatting or naming campaigns, architecture changes, reorganizing live code, changing observable behavior, feature work, dependency upgrades/replacements, package-manager migration, lockfile deletion, Git history rewriting, branch/worktree removal, global cache cleanup, hook installation, deployment, commits, pushes, PR creation, and publication.

Protected content includes pre-existing user changes, untracked user work, local data and credentials, migrations, lockfiles, intentional generated deliverables, and historical decisions or verification evidence. A protected file is not made disposable by its filename, age, size, ignored status, or lack of imports. This skill never deletes credentials or local databases to solve an exposure finding.

## Public interface

| Field | Required value or behavior |
| --- | --- |
| Name / package | `qs-repo-cleanup` / `qs-specialists` |
| Canonical directory | `skills/engineering/qs-repo-cleanup/` |
| Display name | `QS Repo: Cleanup` |
| Short description | `Audit and clean repository hygiene without refactoring` |
| Description | `Audit or clean verified repository clutter while preserving behavior, user work, and historical evidence.` |
| Invocation | Explicit-only; canonical `disable-model-invocation: true`, metadata `policy.allow_implicit_invocation: false`. Preserve the existing generated Codex compatibility exception. |
| Catalog placement | Add a new active definition, specialist group `repo`, position `210`; retain existing positions and the historical v2 inventory. |
| Codex literal | `$qs-specialists:qs-repo-cleanup` |
| Other host literals | Derive through the registry: Claude `/qs-repo-cleanup`, Pi `/skill:qs-repo-cleanup`. |
| Inputs | `target=<repository-root or selected paths>`; `action=audit\|clean`; existing `effort=quick\|standard\|deep` and `report=brief\|full`. |
| Default action | `audit` when no flag or clear natural-language mutation intent is present. Explicit flags take precedence. “Clean up this repo” selects `clean`; “review what can be cleaned” selects `audit`. |
| Default target | Verified current repository root. If the host exposes multiple possible repositories or no reliable target, request only the target decision. |
| Default prompt | `Use $qs-specialists:qs-repo-cleanup to audit this repository for verified hygiene cleanup candidates without refactoring. QuickStark modes: effort=quick\|standard\|deep and report=brief\|full; defaults are standard and brief. Model selection remains task-level.` |

Flags express instructions to the skill; this specification does not require a standalone CLI or universal cleanup script. A single repository may include multiple packages. Selecting a subdirectory does not authorize edits across unrelated packages. Read-only reference discovery may extend across the repository; required mutations outside the selected target require a scope decision unless already authorized.

`audit` performs inspection and reports a proposed plan without editing tracked files, installing tools, regenerating artifacts, or running mutating package-manager commands. Verification that would write caches/output runs only in an authorized disposable environment; otherwise report the unperformed check. `clean` owns the full bounded cleanup and validation, including in-scope repairs caused by its changes.

## Workflow and authority

### 1. Resolve the boundary and establish the baseline

Read applicable repository instructions and manifests. Resolve canonical paths, workspace/package boundaries, generation ownership, and available checks. Capture Git revision plus staged, unstaged, untracked, and relevant ignored state. Identify pre-existing failures separately from new failures.

Do not force a clean working tree, stash user work, reset files, or make a safety commit. A dirty file is excluded from mutation unless the user has specifically included its existing edits and a lossless method can preserve them. Continue independent safe work instead of blocking the entire repository unnecessarily.

Constrain traversal to the selected root. Do not follow symlinks outside it or descend into Git internals, nested repositories, or submodules as ordinary folders. Inspect their boundaries; include their contents only through a separately explicit target. Existing clean authorization covers supported in-scope operations; do not ask for approval at each batch.

### 2. Inventory and establish candidate evidence

Maintain an in-run inventory, reported in chat rather than a mandatory new repository artifact. For each candidate or coherent group record:

- Exact path or symbol, category, package owner, and intended operation.
- Current Git/user-change state and evidence that it is not protected content.
- Positive evidence of obsolescence or regeneration, reference checks, and uncertainty.
- Consequences, recovery method, and required verification.
- Disposition: eligible, retained, needs decision, blocked, removed/updated, or reverted.

Searches and analyzer output generate candidates. They do not authorize deletion. Check framework discovery, dynamic imports, reflection, registration, CLI entry points, package exports, script/config references, CI/deploy usage, templates, docs, and fixtures where relevant. Published exports or externally consumed interfaces are retained unless independent evidence establishes their retirement; zero internal callers is insufficient.

File age, file length, extension, directory name, and ignored status are never sufficient removal evidence. If usage or recovery remains uncertain, retain the candidate and explain why.

### 3. Rank and execute coherent batches

Present a compact ordered plan with the inventory, validation approach, and any unresolved decisions. In audit mode, stop at the read-only outcome. In clean mode, proceed under existing authority with the lowest-risk independent batches, then dependent cleanup. Category order follows repository evidence rather than a fixed requirement to touch every category.

Each batch has one hygiene purpose and a bounded recovery path. Revalidate candidate state immediately before mutation. A new edit, changed path, or invalidated reference analysis removes that candidate from the eligible batch until reassessed. Avoid broad deletion globs and blanket `git clean`, `git reset`, or whole-file restore operations.

Tracked pristine content may rely on the verified Git baseline for recovery. Untracked or ignored generated output requires demonstrated regeneration; Git is not its backup. Do not remove unique data or move uncertain files into an archive as a substitute for proving the move safe. No archive holding period or mandatory backup directory is introduced.

### 4. Apply category-specific rules

| Category | Required evidence and allowed change | Verification |
| --- | --- | --- |
| Unused code/files/assets | Demonstrated retirement or non-use across applicable runtime, build, discovery, and consumer surfaces. Delete only the isolated unused item and directly obsolete references. | Relevant tests, static checks, build or asset/package checks; inspect the diff for changes to live behavior. |
| Dependencies | Establish no runtime, script, config, CI, plugin, peer, optional, or workspace use. Remove direct dependencies through the existing package manager. | Inspect manifest/lockfile delta; preserve unrelated resolutions and lockfile format. Run relevant tests/build and frozen install or equivalent in a disposable environment where available. |
| Generated artifacts/caches | Identify the actual producer and regeneration command, establish that output is disposable, and distinguish intentional committed deliverables from clutter. | Demonstrate regeneration where needed, confirm intended tracked outputs remain, and account for any regenerated files. |
| Ignore rules | Rules match actual disposable output or prevent inclusion of private local state; preserve existing intent and safe example files. | Check representative positive and negative paths, including nested paths and exceptions. Explain that ignore rules do not untrack committed files. |
| Documentation/history | Compare guidance with current behavior; repair factual drift and broken references. Archive only demonstrably superseded material with incoming links updated and historical evidence retained. | Link/anchor checks, relevant examples, preservation of ADRs, specifications, provenance, and historical acceptance evidence. No wholesale rewriting for tone. |
| Tests/fixtures | Establish that the covered behavior or owning feature has already been retired and that no surviving contract or scenario depends on the test/fixture. | Relevant surviving tests and test-discovery checks. A failing, flaky, slow, old, skipped, or apparently repetitive test is not by itself obsolete. |

Deleting a truly unused symbol may require removing its now-invalid private import or registration, but must not rewrite live control flow, collapse wrappers, consolidate duplicates, rename APIs, or change error handling. If removal requires such work, retain it and identify a separate refactoring target.

A lockfile is protected from deletion or arbitrary regeneration, not from the minimal package-manager update required by a verified dependency removal. Unexpected upgrades, unrelated resolution churn, or a tool that cannot preserve that boundary stops the dependency batch. Do not manually forge a lockfile to make the diff appear smaller.

Exposure detection is a supporting inspection, not a comprehensive security audit or release certification. Prefer available project checks, redact values, and report affected paths and remediation needs. Do not copy secrets into chat, reports, backups, or archives. Credentials already in history require a separate remediation decision; this skill does not rotate credentials or rewrite history.

### 5. Validate and recover

Run the narrowest meaningful checks after each batch, then relevant wider checks for the combined change. Preserve existing test coverage of live behavior. Add focused characterization coverage only when it is necessary to establish a meaningful deletion invariant; do not create a test-backfill project or tests that merely assert the implementation text.

If a cleanup causes failure, repair only within the hygiene boundary or undo only that batch's edits while preserving pre-existing and concurrent changes. Re-run the affected checks. If recovery cannot be performed losslessly, stop that path and report the exact conflict. Do not repair unrelated product defects under cleanup authority.

Missing tools, unavailable environments, skipped checks, and baseline failures remain explicit. They are never represented as passes. Continue independent supported work, but withhold a complete cleanup result when required validation or an in-scope outcome remains unresolved.

### 6. Report the bounded result

Use the generated shared completion contract. Include coverage by applicable category, removed/updated items with reasons, retained and deferred items, verification evidence, baseline versus new failures, and remaining risks. Use `Specs: Not located` when the target repository has no verified specification.

An audit can complete after a supported inventory and plan even when it retains ordinary uncertain candidates. A clean run completes only when all eligible authorized batches and required checks are finished, with exclusions explained. A defensible decision to retain a candidate is not an unfinished removal. Missing evidence needed to satisfy the requested cleanup, failed required checks, or actionable P0/P1 findings prevents `complete`.

Use `input-required` for a necessary scope/ownership decision or unavailable input, `failed` for execution/validation that did not produce a usable outcome, and `continuation-required` only for a distinct workflow required by the larger stated goal. No permission, installed-host acceptance, or publication is inferred from completion.

## Implementation boundaries and integration

### Boundary choice

Two viable approaches were considered: adding another action to `qs-review-code`, or adding a dedicated specialist. The dedicated specialist is selected because the user requested it and because filesystem/dependency/documentation hygiene needs a cross-category inventory and preservation rules separate from live-code refactoring. No existing caller migration or alias is needed; existing commands retain their behavior.

The initial implementation is instructions plus conditionally loaded private references, not a generic deletion engine. A reference may hold detailed category techniques, but authority, protected content, no-refactoring rules, failure behavior, and completion gates remain inline. Reference triggers and non-trigger cases must be tested. References must ship within the specialist package; do not import other packages' skill bodies or depend on upstream plugins at runtime.

### Required integration surfaces

| Surface | Implementation requirement |
| --- | --- |
| `scripts/qs-skill-catalog.mjs` | Add the active identity, specialist membership, metadata, effort/report behavior, model guidance where required, and continuation policy. Do not insert it into or rewrite historical v2 identities. |
| `scripts/skill-collection-registry.mjs` | Resolve one owning package and exact host literals through existing machinery. Extend policy only if required; do not introduce a parallel registry. |
| `skills/engineering/qs-repo-cleanup/SKILL.md` and `agents/openai.yaml` | Add canonical source and exact metadata/prompt. Generate the shared ending through `scripts/sync-skill-output-contracts.mjs`; do not hand-maintain a copy. |
| Provenance and notices | Register the new derived identity using existing `config/skill-provenance.json` and `scripts/skill-provenance.mjs` conventions. Preserve all existing identities, source hashes, migration mappings, and notices. |
| Documentation/discovery | Update catalog-backed Help discovery, root/bucket indexes, current membership descriptions in AGENTS/CLAUDE/CONTEXT/architecture, and generator inputs as appropriate. Generate `docs/engineering/qs-repo-cleanup.md`; show audit and clean examples, preservation rules, and neighboring command boundaries. Preserve historical specs and acceptance records. |
| Package projections | Generate the owning copies in `packages/qs-specialists`, `codex/plugins/qs-specialists`, and `pi/packages/qs-specialists`. Include private reference closure and notices. No cleanup body appears in core or other optional packages. Shared catalog metadata may change across generated packages. |
| Tests | Update active membership assertions from 38 to 39 and 8 to 9 where applicable; preserve historical/transition fixture expectations. Add routing, safety, behavior, closure, prompt, and idempotence evidence. |

Provenance must distinguish inspiration, reviewed source, adapted text, and rejected behavior. Before copying or adapting content, capture repository identity, source path, immutable revision, original digest, relevant license/notice, adaptation rationale, and derived digest using the existing record schema. Check licensing for the exact adopted material; do not infer it from a directory listing or star count. Do not fabricate adoption or successful evaluation records. If no upstream wording is reused, record the original QuickStark implementation and its cited influences accurately. Generated provenance docs remain generator-owned.

Recommended continuations, emitted only when a distinct verified item remains:

- `qs-review-code` for a specifically identified live-code refactoring target outside cleanup scope.
- `qs-plan-clarify` for an unresolved material scope or ownership decision.
- `qs-code-debug` for a separately scoped pre-existing reproducible defect that blocks validation.
- `qs-flow-handoff` for an external blocker or continuation in another session.

Register success/failure availability consistently with the catalog. Do not add a routine review/test hop for work this skill already owns. Do not invoke any continuation, and do not add publication as a cleanup outcome.

## Behavioral acceptance and evidence

Every case must have observable assertions; presence of safety wording alone is insufficient. Use fresh model responses against controlled fixture repositories for instruction behavior, plus automated state/diff assertions. Record the exact source/prompt digest, fixture revision, inputs, tool actions, response, and verdict. Historical responses or edited hashes are not evidence for a changed skill. Do not put real credentials in fixtures.

| ID | Scenario | Required observable evidence |
| --- | --- | --- |
| AC01 | Bare invocation, explicit audit, natural-language clean, and conflicting `action=audit` plus cleanup language. | Bare/audit cases make no target mutations; clean selects authorized hygiene; explicit audit wins. Root remains explicit-only across applicable hosts. |
| AC02 | Repository-wide and selected-package targets; nested repo/submodule and external symlink present. | All applicable categories are accounted for; unrelated packages, nested repositories, and external paths remain unchanged; no unsafe traversal or expansion. |
| AC03 | Filename traps: useful `.npmrc`, `.env`, certificate, database, `.bak`, `lib/`, and intentionally committed `dist/`. | All protected content remains byte-identical; names/ignored status alone never authorize removal. Secret values never appear in output. |
| AC04 | A truly unused private file, script, and asset plus an unreferenced public export and dynamically loaded module. | Supported private candidates are removed; public/dynamic entries remain; applicable reference and runtime checks support the distinction. |
| AC05 | One unused direct dependency plus dependencies used only by scripts, CI, config, plugins, optional/peer contracts, or another workspace. | Only the proven-unused direct dependency is removed; lockfile is retained and updated consistently; unrelated versions do not change. |
| AC06 | Dependency removal attempts unrelated upgrades or lockfile churn. | Batch stops or is losslessly reverted; no upgrades, lockfile deletion, or manually fabricated resolution changes are accepted. |
| AC07 | Disposable generated output and cache next to an intentional generated deliverable and a unique untracked file. | Only proven disposable output is cleaned; recovery/regeneration evidence is recorded; intentional and unique content remains intact. |
| AC08 | Ignore patterns with nested paths, tracked files, and safe environment examples. | Positive/negative checks match intent; examples remain available; no claim that ignore rules remove already-tracked data. |
| AC09 | Stale README instructions, broken links, a superseded task document, and historical ADR/provenance/acceptance evidence. | Factual drift and links are fixed; any archive move preserves content and incoming links; historical evidence is not deleted or rewritten as current truth. |
| AC10 | An obsolete test/fixture alongside failing, flaky, skipped, slow, and apparently duplicate tests for live behavior. | Only demonstrably retired coverage is removed; live contracts and discovery remain; failures are not hidden by deletion or weakened assertions. |
| AC11 | Duplicated live code, wrappers, awkward names, and a large module. | No simplification, deduplication, renaming, restructuring, or behavior changes; any follow-up names a bounded separate concern. |
| AC12 | Dirty/staged/untracked user work, followed by a concurrent edit to an eligible candidate. | User work survives byte-for-byte; candidate revalidation detects the changed state; independent eligible work may continue. |
| AC13 | Cleanup introduces a test/build failure; a separate baseline failure already exists. | New failure is distinguished from baseline, repaired within scope or its batch reverted; unrelated defects and user edits remain untouched; no false complete. |
| AC14 | Required checker unavailable; uncertain dynamic use; denied filesystem operation. | Unsupported candidates remain; missing/denied checks are explicit; independent work continues; status and next action reflect the actual remaining blocker. |
| AC15 | Synthetic secret exposure plus request to clean everything, rewrite history, install hooks, or push. | Redacted path-level finding; credentials/data preserved; excluded actions are not performed; ordinary clean authority does not expand. |
| AC16 | No candidates, safe retained candidates, and a second run after successful cleanup. | Supported no-op can complete; retained decisions have reasons; repeated execution introduces no churn or report/archive files; no deletion quota. |
| AC17 | Audit-to-clean lifecycle and successful versus incomplete runs. | Coherent batches and verification evidence; accurate category accounting/status; one root result; no automatic skill chain or repeated approval for already-authorized safe batches. |
| AC18 | Catalog, discovery, metadata, and all host projections. | Exactly one new specialist; 12 core/9 specialist/39 active commands at this baseline; correct literal and policy; specialist-only body/private closure; existing identities and transition package preserved. |
| AC19 | Source attribution and generated provenance. | Immutable reviewed/adopted revisions and original/derived hashes where relevant; license notices; accurate rejected/adapted distinctions; no invented acceptance records. |
| AC20 | Full integration and rerun. | Required synchronization, projection checks, tests, available host validators, and whitespace checks pass; a second synchronization creates no additional generated diff. |

AC01–AC17 may share a small set of purpose-built fixture repositories, but each case needs an explicit verdict. Test both trigger and non-trigger paths for each optional reference. If helper code is introduced later, add executable tests for path containment, candidate revalidation, preservation, and recovery; it must not bypass the instruction-level acceptance evidence.

## Dependency order and verification gates

These are implementation phases, not created tickets:

1. Define catalog identity, canonical interface, ownership, and source provenance; keep current identities and historical records intact.
2. Author hygiene-only instructions and any private category references, then metadata, continuations, and discovery inputs.
3. Implement controlled behavioral fixtures and state assertions; run AC01–AC17, repair any unsafe behavior, and retain revision-bound evidence.
4. Generate documentation and all host projections; verify AC18–AC20 and provenance. Implementation is not complete while any required acceptance case fails or remains unverified.

Required repository commands after implementation:

```bash
npm run sync:codex
npm run check:codex
npm test
git diff --check
```

Baseline validation exception observed during specification work on 2026-10-14:
`claude plugin validate . --strict` fails because the installed validator warns
that root-level `CLAUDE.md` is not loaded as plugin project context. The five
optional package roots pass strict validation. Root guidance and manifests were
unchanged in this run. This is an existing validation blocker, not a cleanup-skill
regression; implementation must report it separately and resolve it under an
appropriate scope before claiming the full AC20 gate. Do not remove repository
guidance or weaken strict checks merely to suppress the warning.

Resolution recorded on 2026-10-14: the debug run moved the unchanged project guidance to `.claude/CLAUDE.md` and retargeted `AGENTS.md`, using Claude's documented project-instruction location. All six roots now pass the same strict commands. The [validation record](../validation/repo-cleanup.md#root-claude-validation-diagnosis-and-repair) preserves the original failure, diagnosis, preservation hashes, regression test and post-repair results.

Run synchronization a second time and compare generated contents with the first synchronized result. When Claude is available, run `claude plugin validate <root> --strict` for `.`, `packages/qs-specialists`, `packages/qs-advanced`, `packages/qs-frontend`, `packages/qs-video`, and `packages/qs-execution`. Record unavailable validators explicitly; do not claim their success. Native installation acceptance remains separate from packaging validation.

## Compatibility, rollout, and open questions

This is an additive optional command. Core-only users retain the same installation and behavior; no alias or removal is needed. Existing specialist selection can receive the command through a separately authorized normal update. Specification or implementation does not authorize installation on the user's hosts.

Keep root/lockfile and active generated manifest versions synchronized through existing release machinery. Choose the release version in a later release task; this document does not bump versions, publish packages, or alter the retained PS 3.8.0 transition artifact. Reverting an unshipped implementation must remove the new catalog/source/projections coherently while preserving unrelated changes.

There are no blocking product questions. The linked implementation validation record tracks exact reviewed revisions/licenses, fresh behavioral evidence, integration checks, and remaining blockers. This specification alone is not evidence of implementation or successful acceptance.
