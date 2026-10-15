# Repository cleanup implementation validation

Specification: [quickstark-repo-cleanup](../specs/quickstark-repo-cleanup.md). Local implementation against baseline `6bed58bee404ce51c82652621bce5a6465adff09`, version 4.0.2. No installation, commit, push, or publication is part of this work. Validation occurred on October 14, 2026 America/Chicago (October 15 UTC for the later trials).

## Implementation and test strategy

Added one explicit specialist, `qs-repo-cleanup`, at lifecycle position 210. Existing identities and positions remain. Catalog, registry, canonical instructions, Codex metadata, Help discovery, current counts, provenance, and Claude/Codex/Pi projections agree on 12 core / 9 specialist / 39 active commands. The historical PS transition package is unchanged. The skill has no private references or executable cleanup helper, so conditional-reference trigger/closure tests are not applicable. All category rules and safety boundaries are inline.

Initial routing/source contract tests failed before implementation and passed after integration. Instruction behavior uses fresh controlled model trials plus automated actual-state assertions; string-presence tests alone cannot validate this skill. The added live-trial runner is evaluation tooling, not a packaged deletion engine. Existing projection/provenance tests continue to enforce byte equality, policy, notices, immutable historical IDs, and retained transition content.

## Behavioral evidence

Nine fresh trials against the revised canonical source passed parent review, and all eight automated cleanup evidence/contract tests pass. Evidence lives in [the fixture directory](../../tests/fixtures/repo-cleanup/README.md); [offline assertions](../../tests/repo-cleanup.test.mjs) bind current source, scenario, prompt, raw tool events, response, preserved state, and parent verdict hashes. Runs use the existing Codex runtime without model/reasoning overrides. Raw process telemetry records completion, timeout, stop reason, and residual-process observations. The event stream did not expose a model identifier; no model identity is inferred. T01–T08 share the first frozen capture; T09 is a supplemental capture of the same skill bytes with the additional scenario.

Git revision/index facts are simulated observations supplied to synthetic exports; no real commits were created. Actual file mutations and checker execution are captured. Dependency trials use an inspectable local fixture package manager, not a real installation. Response-only cases demonstrate decisions, not executed operations. This is single-sample acceptance evidence, not a reliability benchmark, race-free transaction guarantee, installed-host acceptance, or security certification.

The initial T02 trial edited after a failed state guard, despite preserving protected bytes. Initial T04 knowingly ran an operation with unrelated version churn and then reverted it. Those observations are retained as rejected evidence. The revised instructions require a successful guard before mutation, lossless integer/hash comparisons, and stopping a known-invalid operation before executing it. Current acceptance must use the revised source, never the earlier response with a changed hash.

| Acceptance | Evidence and observable requirement | Verdict |
| --- | --- | --- |
| AC01 | T01 action precedence; canonical/host explicit-only contracts | Verified |
| AC02 | T02 nested/external preservation; T06 selected-package boundary decisions | Verified |
| AC03 | T02 protected filename traps and private values preserved | Verified |
| AC04 | T02 retired private file/script/asset removed; public/dynamic consumers retained | Verified |
| AC05 | T03 only unused dependency removed; T09 script/config/optional consumers retained | Verified |
| AC06 | T04 unrelated resolution churn prevented; original manifest/lock bytes retained | Verified |
| AC07 | T02 cache producer/regeneration demonstrated; intentional release and unique user files retained | Verified |
| AC08 | T02 ignore positives/negatives; offline real Git check-ignore matrix | Verified |
| AC09 | T02 README command/link corrected; T09 superseded history and incoming-link decisions | Verified |
| AC10 | T02 retired test/fixture removed; T09 failing/slow/flaky/skipped/duplicate live tests retained | Verified |
| AC11 | T02 duplicate live source unchanged; T09 wrappers/naming/large module retained | Verified |
| AC12 | T02 dirty/untracked preservation; T08 concurrent edit retained with independent cache cleanup | Verified |
| AC13 | T05 new failure recovered; baseline failure remains explicit and status incomplete | Verified |
| AC14 | T06 unavailable checker/denied operation/uncertain use; T08 invalidated candidate | Verified |
| AC15 | T06 redacted exposure and excluded history/hooks/push decisions; no external operations | Verified |
| AC16 | T07 repeated cleanup with identical before/after state and no reports | Verified |
| AC17 | T01/T02/T05/T07/T08/T09 supported planning, clean/no-op/incomplete outcomes | Verified |
| AC18 | Catalog/metadata/docs/host projection/membership/transition assertions | Verified |
| AC19 | Pinned influences, original wording, derived hashes and original-record preservation | Verified |
| AC20 | Synchronization, full tests, projection checks, whitespace, second-sync equality; root Claude strict check | Verified after guidance-preserving repair below |

## Source attribution

[Influence records](../../tests/fixtures/repo-cleanup/influences.json) retain the exact reviewed repository, path, immutable revision, original SHA-256 and MIT license-file hash. The specification records the original comparison. Cortex informed category coverage; repo-hygiene informed phased inventory, coherent execution and verification; the other cleaners informed behavior-preserving checks and useful boundaries. Filename-only deletion, broad restructuring, simplification/deduplication, hook installation, and automatic publication were rejected.

The canonical skill is original QuickStark wording. No external skill body/helper was copied or adapted, so no upstream adoption revision or new copied-code notice is asserted. Existing third-party notices and all 71 earlier provenance records remain unchanged. The new local identity has its own derived digest. Its target decision remains `pending` with revision `null`: there is no committed implementation revision or installed-host adoption to record. Local behavioral evidence is recorded separately and does not fabricate one.

## Repository verification and original blocker

The original cleanup run passed **477/477 tests**, with no skipped or cancelled checks; all eight cleanup-specific tests are included. Synchronization and projection/output/provenance checks pass. The second synchronization compares repository file/link contents before and after; its [record](../../tests/fixtures/repo-cleanup/evidence/sync-idempotence.json) reports zero changed paths. `git diff --check` passes. Exact check results and log hashes are recorded in [integration evidence](../../tests/fixtures/repo-cleanup/evidence/integration.json).

The [six-root Claude validation record](../../tests/fixtures/repo-cleanup/evidence/claude-validation.json) reproduces the baseline failure:

`claude plugin validate . --strict` exits 1 because root `CLAUDE.md` is not loaded as plugin project context; strict mode treats that warning as an error. This existed before the addition. The guidance remains present, strict checks remain enabled, and only its active membership counts changed. All five optional roots passed strict validation in the implementation check. Their success is packaging evidence, not installation acceptance.

The original blocker and its failed result above remain historical evidence. The following debug run resolved the warning; final integration revalidation is recorded below.


## Root Claude validation diagnosis and repair

Claude Code **2.1.300** reproduced the root failure with `claude plugin validate . --strict --json`. The marketplace manifest had no errors or warnings; the only gating result was the regular root `CLAUDE.md`. README install advice was non-gating. The root is also the core plugin root, as declared by the collection registry and generated manifest.

Eight minimal fixture cases isolated the cause. A plugin without root guidance passed; adding a regular `CLAUDE.md` failed even with empty contents. Selecting the manifest directly still failed. A marketplace-only fixture did not trigger the plugin-root warning. A root symlink avoided the warning, but that traversal behavior is not the chosen repair. These observations agree with the official [validator reference](https://code.claude.com/docs/en/plugins/cli-reference#validate-a-directory).

The repair moves the existing guidance, byte-for-byte, to `.claude/CLAUDE.md` and retargets the existing `AGENTS.md` symlink. Claude documents this as a [supported project-instruction location](https://code.claude.com/docs/en/memory). Guidance SHA-256 before and after is `26a229c5dcfba56244073506e3777c127a87e2bc19eeb1e144881cc3aaf2a456`. No manifest, public skill, strict-check command, or instruction text changed. Contributor documentation and the existing guidance-content test now reference the supported location. A new regression test fails on the former layout and verifies that both hosts share the same nonempty guidance file.

A disposable copy of the actual repository reproduced the failure, then passed root and all five optional strict checks with this repair. An unknown manifest field still failed strict mode. The [raw diagnosis record](../../tests/fixtures/repo-cleanup/evidence/claude-root-diagnosis.json) retains inputs, outputs and negative controls.

One independent coverage limit remains: root validation did not reject malformed frontmatter in the core's nested canonical skill directory, while it did reject malformed frontmatter in the flat specialist projection. This was observed in a disposable copy and does not replace or weaken existing source/projection tests. No interactive installed-host context-loading acceptance is claimed; the guidance location is supported by the official documentation and its bytes/link target were verified locally.

Final post-repair checks pass: **478/478 tests**, all six Claude roots with `--strict`, source/projection/provenance checks, and `git diff --check`. A second synchronization makes no additional changes. See [post-repair integration evidence](../../tests/fixtures/repo-cleanup/evidence/integration-after-guidance-repair.json) and [current strict-validator results](../../tests/fixtures/repo-cleanup/evidence/claude-validation-after-guidance-repair.json). AC20 is now verified; the original failed records remain intact.

## Local 4.1.0 release preparation

Following [the contributor release workflow](../contributing.md), a minor Changeset for the additive specialist and guidance-layout repair selected `qs-skills` 4.0.2 → **4.1.0**. `npm run version` consumed that Changeset into the root package version and changelog. The lockfile's two root-version fields were synchronized without changing its dependency graph. No pending Changeset is retained for this already-applied bump.

`npm run sync:codex` regenerated all six active collections across Claude, Codex, and Pi. All 18 active package manifests now report 4.1.0. The three historical PS payloads remain exactly at 3.8.0 with their retained content and portable-directory hashes. Canonical cleanup instructions and repository guidance bytes are unchanged, so the nine source-bound behavioral trials remain applicable; they were not rerun or represented as new trials.

Fresh validation of the versioned result passes **478/478 tests**, all six Claude roots with `--strict --json`, projection/output/provenance checks, and `git diff --check`. Another synchronization changes no repository file or symlink contents. [Release preparation evidence](../../tests/fixtures/repo-cleanup/evidence/release-preparation-4.1.0.json) records the consumed Changeset plan, active versions, retained transition hashes, strict-validator output, full-suite log hash, synchronization equality, and preservation of pre-existing work. The original root-validation failure remains historical evidence above; the supported guidance layout passes with strict checks intact.

This is a prepared local release, not a published artifact or installed-host acceptance. No installation, commit, push, tag, or publication was performed. The release preparation changes only the expected version/changelog files and this validation evidence; it preserves the earlier implementation and guidance-layout repair.

## Subsequent server-update preflight

The requested live update uncovered an additive-package compatibility defect: the updater compared the installed 4.0.2 specialist command set to the new catalog before recognizing its immutable prior payload. A local repair permits a prior active version to contain a subset of current commands only while retaining exact trusted Git-tree verification. Same-version mismatches, removed/renamed identities without migration, modified cache bytes, and the retained PS checks still block. A fresh isolated regression fails before the repair and passes afterward, including actual native replacement, cleanup-command discovery, selected-state verification, and rejection of a modified historical cache. The full suite passes **479/479 tests**.

Fresh isolated discovery of the local payload finds **39 commands in Codex and Pi**, and relocated private-resource checks pass across all three host projections. Its [record](../../tests/fixtures/adoption-final-discovery/release-4.1.0/result.json) uses the local 4.1.0 metadata; it is **not** evidence for the separately published 4.1.0 release or for live-machine rollout.

A read-only `git ls-remote origin refs/heads/main` returned `73d5a3cc5bf4913d0b21aca771179ca5ea4e2f21`. That published main revision already uses **4.1.0** for Codex-home targeting and does not contain `qs-repo-cleanup`. Consequently the earlier local release preparation above must not be published as another 4.1.0. Including cleanup on top of that release normally requires a new minor version, 4.2.0, followed by fresh version-bound evidence.

Live Codex still has all six packages cached at 4.0.2. Pi's existing six registrations point directly into this working checkout and therefore see its local files, but immutable-release verification fails. No live host configuration or Codex cache was changed. The post-repair Codex plan correctly blocks uncommitted release payloads; the updater also requires exact `origin/main` HEAD and committed acceptance sources/evidence. [Preflight evidence](../../tests/fixtures/repo-cleanup/evidence/rollout-preflight.json) preserves these findings and the fresh test logs. Release selection and the existing restriction on commit/publication remain unresolved; no successful server update is claimed.

## Selected 4.2.0 release

The user subsequently selected **cleanup in 4.2.0**. Release preparation is isolated in `/github/.worktrees/qs-release-4.2.0`, branch `codex/qs-release-4.2.0`, based on published main revision `73d5a3cc5bf4913d0b21aca771179ca5ea4e2f21`. The source changes merged cleanly with the published Codex-home targeting and acceptance-portability fixes. The original `/github/skills` files and symlinks remain unchanged. Earlier local 4.1.0 records above are historical and do not describe the published 4.1.0 payload.

A new minor Changeset selected 4.1.0 → 4.2.0 and was consumed by `npm run version`. The published 4.1.0 changelog entry remains intact. Root and lockfile versions and all **18 active manifests** are synchronized at 4.2.0; the dependency graph and PS 3.8.0 payloads remain unchanged. Cleanup instructions and guidance retain their previously recorded SHA-256 values.

Fresh versioned validation passes **495 tests**, with **zero failures** and one intentional non-Linux platform-control skip (496 cases total). The initial run failed only the newly inherited acceptance-evidence synchronization assertion; its log is retained. The reviewed audit was refreshed, including the moved guidance reference, and the full rerun passed without weakening checks. All six Claude roots pass strict validation. Actual isolated native enumeration finds **39 commands on each of Codex and Pi**, and relocated video/execution closure checks pass for all three projections. Existing source-bound cleanup trials remain applicable; no new model trials are claimed.

The [4.2.0 evidence directory](../../tests/fixtures/adoption-release-4.2.0/review.md) contains the reviewed delta, consumed Changeset plan, manifests, strict results, initial and final test logs, original-checkout preservation record and final integration checks. The [native discovery record](../../tests/fixtures/adoption-final-discovery/release-4.2.0/result.json) is bound to this exact versioned payload. Acceptance retains prior decisions and evidence while binding all six packages on both supported transaction hosts to current source bytes. Another synchronization produces no file or symlink-content changes.

Preparation is complete; publication and live rollout are not. The requested server/Codex/Pi update is authorized, but the user's earlier explicit restriction on committing, pushing, tagging and publishing has not been lifted. The production updater still requires a committed release matching `origin/main`, followed by ownership/selection checks at the stable server checkout. No live configuration/cache mutation or repository commit, push, tag or publication occurred during this preparation.

Subsequent authorization: the user approved committing, pushing, tagging and publishing the prepared 4.2.0 release, followed by completing the server's Codex and Pi update. The preparation statements above record the earlier boundary; they do not revoke this later approval. Publication and actual-machine results must be verified separately.

Publication preflight staged every new evidence file and exposed raw-capture whitespace that the earlier unstaged diff check had not inspected. Original trial responses and the initial failed test log were serialized losslessly as UTF-8 JSON strings; decoding reproduces their original SHA-256 values, including Markdown hard-break spaces. The evidence reader checks the decoded bytes against the unchanged parent verdicts. No whitespace or strict-validation exception was added. The original captures remain preserved in `/github/skills`, and the staged diff check now passes.
