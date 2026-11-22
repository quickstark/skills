# Ticket graph — QuickStark repository layout

**Specification:** [QuickStark repository layout](./quickstark-repository-layout.md). **State:** the developer-authoring milestone is committed at `bb8ecfa`. LAY-12 through LAY-14 are verified in an isolated checkout. These are repository-local work IDs. The graph can be consumed directly by `qs-code-build mode=graph`.

## Worker brief

Base all starting pointers on `f1324e8b81311f2ee3209ab35808011db29a5d52`. Follow renames from that revision after a predecessor moves a file. Each ticket owns its stated outcome, directly affected consumers and tests. Additional reads are allowed. Preserve concurrent edits, generated-file ownership and historical bindings. The three existing uncommitted inputs at specification time have these SHA-256 identities:

| File | SHA-256 |
|---|---|
| `README.md` | `6d556edc0da2c8174fd718885e3fc1ccb8b22add260894c8e5bc256a4558df01` |
| `docs/architecture.md` | `b7b78424b821c7ae6bae421b9049dbb42953cbcdcdab594d9a252879ceec60ff` |
| `docs/validation/upstream-adoption-acceptance.json` | `25bc1ec253d114e829130f6d2ff41df3a53d0bce4504783532f4e4b837a5bb7d` |

Readiness depends only on the explicit edges. At creation the frontier is **LAY-01, LAY-02, LAY-03 and LAY-12**. Start with LAY-01 for the shortest path to a visible developer improvement. Prefer LAY-11 (authoring milestone) before activating a release layout. LAY-18 closes the repository-layout track independently of the archive. LAY-20 joins both tracks.

Close a ticket against its acceptance evidence at its integration revision. Record the ticket state, revision, checks and any qualified platform skip where the build is tracked. Recompute the frontier after every verified completion. Overlapping generator, registry and evidence-file edits need serialized integration and revalidation against the integrated revision. Keep path-switch batches on an unpublished integration branch if they cannot pass independently. Run sync to completion before invoking projection checks or tests that read generated files. Keep public commands and prior host registrations operational across any shipped boundary.

## Developer-authoring verification

Developer-authoring commit `bb8ecfa` on `codex/docs-446-restart` was based on `f1324e8b81311f2ee3209ab35808011db29a5d52`. The registered inventory has 39 canonical public roots, with the original package ownership, editorial categories, lifecycle positions and invocation policies.

The move retained 1,167 source files and their Git executable modes. Seventeen instruction files required path-only edits. All eight relocated governance records match their original Git blobs. The development linker reproduced its 67 original targets in each disposable home. The three retained PS distributions match the baseline.

A disposable checkout propagated one edit to `skills/qs-repo-cleanup/SKILL.md` into its Claude, Codex and Pi copies and updated its current derived digest. Restoring the source and synchronizing twice reproduced the original candidate tree. Historical release checks read pinned Git objects or original captured fixtures.

The integrated checkout passed `npm run sync:codex`, `npm run check:codex` and `git diff --check`. The full `npm test` run passed 799 tests, with one platform-specific skip on Linux and zero failures.

## Tooling verification

The [tooling directory guide](../../tooling/README.md) maps command names to their owners. Of the 72 tracked files originally under `scripts/` and `config/`, 65 scripts and all six config files moved into `tooling/`. The hosted bootstrap stays at its download URL. Five compatibility entry points cover published installers, the managed CLI and the public skill listing. All 19 npm scripts retain their names.

The isolated candidate on base `bb8ecfa` preserved the six config files byte-for-byte, the Git executable modes, all host distributions and the manual release workflows. Both the current and published bootstrap ran from an empty working directory against both fixture layouts. Each pairing validated before dispatch and reused its retained checkout on retry.

The published v4.4.7 bootstrap also validated the actual candidate, and the current bootstrap validated the actual v4.4.7 tree. Both reached the updater at the expected revision and rejected an intentionally unsupported target before any native operation. Disposable checkout `4c96d6c073317920b301fd2e40043bad94154d3c` passed the release validator for all 18 package and host combinations. Strict Claude validation passed for all six packages.

After synchronization, `npm run check:codex` and `npm test` passed in the isolated checkout (800 tests passed and one non-Linux control skipped). A second synchronization reproduced the checked tree.

## LAY-01 — List the public authoring sources

Status: verified

Blocked by: none

Acceptance criteria: AC-01

**Outcome and scope.** Replace the default recursive list with registry enumeration at the existing command entry. Capture the baseline public name, path, package, bucket, lifecycle and metadata policy as a comparison for moves.

**Starting points.** `scripts/list-skills.sh`, `scripts/skill-collection-registry.mjs`, `tests/skill-collection-registry.test.mjs`.

**Verify.** Exercise the actual command from another working directory. Each of the 39 real source paths appears once in stable order. Add a decoy fixture and generated copy in an isolated checkout and obtain the same output. An invalid registered source fails visibly.

**Excludes.** Source moves, reclassification and changing the separate development linker.

## LAY-02 — Unify developer decisions and historical notes

Status: verified

Blocked by: none

Acceptance criteria: AC-04

**Outcome and scope.** Index decisions under docs/adr, distinguish colliding historical numbers by origin, and place the completed ledger and disposition notes with their history. Classify old instructions against current guidance. Update active links and preserve an original-path lookup for archived references.

**Starting points.** `.agents/adr`, `.agents/invocation.md`, `.agents/writing-docs.md`, `.out-of-scope`, `docs/adr`, `GATES.md`, `docs/validation/progress-deploy.md`.

**Verify.** Compare moved historical bytes and list each old→new address. Verify all active incoming links, the root AGENTS.md symlink, the current Claude/Codex discovery manifests and the local ledger's historical reference. Preserve a narrowly documented compatibility pointer if a live reader requires one.

**Excludes.** Rewriting historical policy, modifying .unlazy, or moving host-discovery paths.

## LAY-03 — Prove independent archive retrieval

Status: open

Blocked by: none

Acceptance criteria: AC-08

**Outcome and scope.** Provide an explicit retrieval procedure for the four split parts from the pinned official revision. Use private temporary storage and the two existing member verifiers. Record immutable revision, original paths, digests, retention basis and restoration procedure.

**Starting points.** `tests/fixtures/frontend-adoption-v3-results/archive.json`, `tests/fixtures/frontend-mobile-repair-results/archive.json`, `docs/validation/frontend-adoption.md`.

**Verify.** On a clean checkout without the four local parts or object cache, retrieve from the documented source and run both original verifiers. Reject missing, corrupt, swapped and truncated parts. Preserve existing files on failure. Record the restoration transcript and actual byte count.

**Excludes.** Deleting tracked parts, introducing an automatic network dependency, or publishing to new storage.

## LAY-04 — Separate public identity from the physical source path

Status: verified

Blocked by: LAY-01

Acceptance criteria: AC-01, AC-02

Prerequisite evidence. LAY-01 supplies public inventory and executable discovery comparison.

**Outcome and scope.** Resolve each active command from explicit repository-relative source metadata. Migrate source-reading callers, including discovery, output-contract and index generators. Keep existing bucket semantics for editorial links. Support a mixed fixture with old and flat paths during migration. Ensure a stale bucket README cannot recreate an obsolete source folder.

**Starting points.** `scripts/qs-skill-catalog.mjs`, `scripts/optional-command-definition.mjs`, `scripts/sync-v3-docs.mjs`, `scripts/sync-codex-plugin.mjs`.

**Verify.** Run discovery, contract generation, documentation and package generation on old-layout and mixed-layout fixtures. Test duplicate, absent, out-of-root and symlink paths before writes. Package content at the current layout still passes parity checks.

**Excludes.** Moving live sources or changing host roots.

## LAY-05 — Separate current provenance from frozen path evidence

Status: verified

Blocked by: LAY-04

Acceptance criteria: AC-03, AC-09

Prerequisite evidence. LAY-04 supplies validated path mapping independent of bucket.

**Outcome and scope.** Identify live locator fields versus revision-bound historical fields. Support current paths and the immutable evidence inputs used by the regression suite. Document which current bindings may change after a reviewed move and how to retrieve historical bytes for offline tests.

**Starting points.** `scripts/skill-provenance.mjs`, `scripts/adoption-acceptance.mjs`, `config/skill-provenance.json`, `tests/lean-execution.test.mjs`, `tests/skill-provenance.test.mjs`.

**Verify.** Use a moved fixture with equivalent contents to validate both identities. Mutating bytes, executable bits or an original evidence digest is rejected. Prior adoption decisions retain their original values. Current path relocation is separately attributable.

**Excludes.** Requalifying packages, updating frozen trial expectations, or bulk digest replacement.

## LAY-06 — Move shared private resources by owner

Status: verified

Blocked by: LAY-05

Acceptance criteria: AC-03, AC-09

Prerequisite evidence. LAY-05 supplies historical/current mapping and checks for relocated resources.

**Outcome and scope.** Move core, advanced and frontend private material to skills/_shared by owner. Migrate direct readers, path rewrites, dependency indexes and notices together. Preserve projected package-relative resource paths where possible.

**Starting points.** `skills/internal`, `skills/advanced`, `skills/frontend`, `scripts/frontend-dependencies.mjs`, `scripts/progress-reporting-contract.mjs`, `scripts/sync-codex-plugin.mjs`.

**Verify.** Regenerate and compare inventories by owner, including tools, executable bits, notices, frontend indexes and internal references. Verify independent installed copies resolve their helpers. Discovery still returns the public inventory.

**Excludes.** Public roots, dormant sources and command-local video/execution trees.

## LAY-07 — Remove dormant and PS source buckets from the authoring view

Status: verified

Blocked by: LAY-05

Acceptance criteria: AC-03, AC-09

Prerequisite evidence. LAY-05 supplies frozen provenance lookup for historical paths.

**Outcome and scope.** Move the four dormant buckets and historical PS authoring sources to docs/reference/skills. Update source inventory, progress-contract enumeration and supported development consumers. Inventory the linker's pre-move selections and preserve intentional behavior in a disposable home.

**Starting points.** `skills/misc`, `skills/personal`, `skills/in-progress`, `skills/deprecated`, `skills/pstack`, `scripts/ps-skill-catalog.mjs`, `scripts/link-skills.sh`.

**Verify.** Compare original/destination bytes and licensing for reference files except explicitly reviewed path references. Confirm active listing stays at 39, the linker preserves its established selections and exclusions, and transition-package verification sees exactly the original three PS payloads.

**Excludes.** Running the development linker in a real home or relocating frozen PS distributions.

## LAY-08 — Move core and specialist commands to name-based paths

Status: verified

Blocked by: LAY-05

Acceptance criteria: AC-02, AC-09

Prerequisite evidence. LAY-05 supplies relocatable public sources and evidence bindings.

**Outcome and scope.** Move the twelve core and nine specialist source roots, metadata and command-owned files. Adjust registry entries, root Claude source paths, links and current evidence for this cohort. Use existing generators for derived edits.

**Starting points.** `scripts/qs-skill-catalog.mjs`, `skills/engineering/qs-help`, `skills/engineering/qs-repo-cleanup`, `skills/productivity`, `.claude-plugin/plugin.json`.

**Verify.** For all 21 names compare registry identity, lifecycle, metadata, invocation and each host's package-relative tree. Exercise help, cleanup and a productivity command through normal source discovery.

**Excludes.** Optional advanced, frontend, video and execution commands.

## LAY-09 — Move advanced and frontend public commands

Status: verified

Blocked by: LAY-05

Acceptance criteria: AC-02, AC-09

Prerequisite evidence. LAY-05 supplies relocatable public sources and evidence bindings.

**Outcome and scope.** Relocate 12 advanced and four frontend public roots. Preserve their distinct ownership, UI literals, internal resource resolution and upstream attribution. Reconcile the cohort against the integrated private-resource mapping if LAY-06 lands concurrently.

**Starting points.** `scripts/advanced-skill-catalog.mjs`, `scripts/frontend-skill-catalog.mjs`, `skills/engineering/qs-visual-parity`, `skills/engineering/qs-design-frontend`.

**Verify.** Verify all 16 commands have unique flat paths, correct owning packages and identical host-relative resources except documented path changes. Run advanced and frontend catalog/projection tests.

**Excludes.** Moving shared files owned by LAY-06 or changing invocation policy.

## LAY-10 — Move video and execution with their complete module trees

Status: verified

Blocked by: LAY-05

Acceptance criteria: AC-02, AC-03, AC-09

Prerequisite evidence. LAY-05 supplies relocatable public sources and evidence bindings.

**Outcome and scope.** Relocate the two remaining public roots with modules, runtime profiles, indexes and tools intact. Update their active source bindings and exercise packaged file lookup outside the repo.

**Starting points.** `skills/video/qs-video`, `skills/engineering/qs-unlazy`, `scripts/video-skill-catalog.mjs`, `scripts/execution-skill-catalog.mjs`, `tests/video-candidate.test.mjs`, `tests/execution-candidate.test.mjs`.

**Verify.** Verify all 21 video modules, execution dependency inventory, executable bits, license notices and offline resource probes from independently moved fixtures. A missing member fails verification.

**Excludes.** Adding runtimes or invoking external video/model providers.

## LAY-11 — Verify the developer authoring milestone

Status: verified

Blocked by: LAY-02, LAY-06, LAY-07, LAY-08, LAY-09, LAY-10

Acceptance criteria: AC-01, AC-02, AC-03, AC-04, AC-09

Prerequisite evidence. LAY-02 supplies consolidated developer guidance. LAY-06 supplies private resource roots. LAY-07 supplies historical sources outside the active tree. LAY-08 supplies flat core and specialist sources. LAY-09 supplies flat advanced and frontend sources. LAY-10 supplies flat video and execution sources.

**Outcome and scope.** Remove obsolete public bucket indexes and source lookup fallbacks after checking all migrated callers. Generate one authoring index, update instructions and distinguish historical links from active paths. Reconcile grouped moves on one integration tip.

**Starting points.** `README.md`, `docs/architecture.md`, `docs/contributing.md`, `scripts/sync-v3-docs.mjs`.

**Verify.** Fresh checkout: locate cleanup by name, make one trial edit, regenerate its three derived copies, inspect expected differences and discard only the trial. Assert one canonical path per ID, 39 names, no resurrected bucket directories after a second sync, and passing integrated checks.

**Excludes.** Dist cutover, archive retrieval and real client installs.

## LAY-12 — Define relocatable repository tooling and bootstrap entry points

Status: verified

Blocked by: none

Acceptance criteria: AC-05

**Outcome and scope.** Inventory external npm, CLI, CI, pinned-URL and downloaded-file entry points. Establish stable lookup for the checkout root and old/new tagged entry points, and assign each script and config to its target owner. Provide compatibility files only where a real caller requires them.

**Starting points.** `package.json`, `install.sh`, `scripts/install-skills.mjs`, `scripts/validate-skill-release.mjs`, `.github/workflows`.

**Verify.** Invoke the standalone bootstrap from an otherwise empty directory against isolated official-source fixtures. Verify old/new bootstrap and supported-tag pairings, including missing/dirty candidate rejection and retry of a retained physical checkout. Preserve pinned restart URLs.

**Excludes.** Moving native package registrations, network publication or editing historical tags.

## LAY-13 — Consolidate catalog, generator and verification tooling

Status: verified

Blocked by: LAY-12, LAY-11

Acceptance criteria: AC-05, AC-09

Prerequisite evidence. LAY-12 supplies relocation and supported-entry contract. LAY-11 supplies final authoring paths consumed by generators.

**Outcome and scope.** Move catalog, projection, provenance, test, research/trial and related authoring utilities to tooling by responsibility. Place their owned config alongside consumers. Keep embedded package script/resource names stable through generation. Reconcile imports, root calculations, npm aliases and any directly invoked scripts.

**Starting points.** `scripts/sync-codex-plugin.mjs`, `scripts/skill-collection-registry.mjs`, `scripts/qs-test-runner.mjs`, `scripts/skill-provenance.mjs`, `config/skill-provenance.json`, `package.json`.

**Verify.** Check inventory coverage for the assigned files, existing npm targets, hermetic runner entry, release assertions and package-private import closure in an isolated checkout. Explicitly compare allowed path changes and detect stranded entry points.

**Excludes.** Installer/transaction modules and live host path migration.

## LAY-14 — Consolidate installer and release tooling

Status: verified

Blocked by: LAY-12

Acceptance criteria: AC-05, AC-07

Prerequisite evidence. LAY-12 supplies cross-version bootstrap and tooling entry contract.

**Outcome and scope.** Move installation, migration, personal-skill and release implementation plus their owned configs under tooling. Retain verified standalone files at old supported URLs and old-caller shims where required. Keep package-owned script layouts stable. Reconcile imports against work from LAY-13 at integration.

**Starting points.** `install.sh`, `scripts/update-skills.mjs`, `scripts/managed-skills.mjs`, `scripts/migration-transaction.mjs`, `scripts/personal-skills`, `config/skill-profiles.json`, `.github/workflows/release.yml`.

**Verify.** Prove old bootstrap→candidate and candidate bootstrap→old tag with disposable tags/homes. Verify version selection, saved package choices, pinned recovery, npm aliases, manual release workflow paths and the stable hosted shell entry. Check closure from an empty standalone directory.

**Excludes.** Publishing tags or changing release policy, version, journal semantics or physical package roots.

## LAY-15 — Model both native distribution layouts before cutover

Status: open

Blocked by: LAY-01

Acceptance criteria: AC-06, AC-07

Prerequisite evidence. LAY-01 supplies active package identity baseline.

**Outcome and scope.** Define active destination mappings for all hosts and old-root recognition for supported releases. Bind ownership to official source, host, package and validated payload. Keep exact transition roots separate. Stage an alternate output tree in a disposable directory.

**Starting points.** `scripts/skill-collection-registry.mjs`, `scripts/managed-marketplace-bootstrap.mjs`, `scripts/clean-install-skills.mjs`, `scripts/skill-transition-packages.mjs`, `config/skill-transition-packages.json`.

**Verify.** Construct old/new fixture trees and a foreign same-name tree. Accept each legitimate path only for its matching host, official source and revision. Reject aliases, dirty payloads, path escapes and ambiguous matches. Verify all three legacy digests.

**Excludes.** Changing the default output layout or withdrawing an installed package.

## LAY-16 — Stage the new active distributions and marketplace entries

Status: open

Blocked by: LAY-15

Acceptance criteria: AC-06

Prerequisite evidence. LAY-15 supplies old/new host layout and ownership rules.

**Outcome and scope.** Generate six packages under each of dist/claude, dist/codex and dist/pi in a candidate checkout. Point test marketplaces at their required discovery roots and use each host's native relative path format. Explicitly track release output where Git ignore settings would omit dist.

**Starting points.** `scripts/sync-codex-plugin.mjs`, `scripts/skill-package-projection.mjs`, `.claude-plugin/marketplace.json`, `codex/.agents/plugins/marketplace.json`, `tests/pi-package-projection.test.mjs`.

**Verify.** Verify 18 candidate package trees, disjoint package membership, host invocation differences, notices and checked-in files/modes in a fresh clone. Strictly validate actual Claude roots and test Codex/Pi discovery. A second generation is byte-stable.

**Excludes.** Making dist the default for ordinary users or relocating PS 3.8.0.

## LAY-17 — Qualify Codex upgrades across package layouts

Status: open

Blocked by: LAY-14, LAY-16

Acceptance criteria: AC-07, AC-09

Prerequisite evidence. LAY-14 supplies relocated production installer. LAY-16 supplies candidate host trees and actual manifests.

**Outcome and scope.** Exercise Codex fresh install, previous-layout upgrade, optional packages, direct-checkout ownership and frozen journal retry using the relocated production installer and candidate marketplace.

**Starting points.** `tests/install-skills.test.mjs`, `tests/managed-skill-input.test.mjs`, `tests/skill-transition-packages.test.mjs`, `scripts/migration-native-packages.mjs`.

**Verify.** In isolated default and custom Codex homes, compare old/new marketplace roots and retained PS registration. Interrupt after withdrawal and prove retry and rollback preserve selections, backups and unrelated marketplaces. Reject edited or foreign source before native effects.

**Excludes.** Real user profiles, release publication or upgrading historical acceptance decisions.

## LAY-17B — Qualify Claude Code upgrades across package layouts

Status: open

Blocked by: LAY-14, LAY-16

Acceptance criteria: AC-07, AC-09

Prerequisite evidence. LAY-14 supplies relocated production installer. LAY-16 supplies candidate Claude packages and native marketplace manifest.

**Outcome and scope.** Exercise the root-based core and package-based Claude bindings through fresh install, upgrade, interruption, retry and rollback. Include selected optional packages, original source verification and preservation of foreign caches.

**Starting points.** `scripts/claude-core-migration.mjs`, `tests/managed-skill-input.test.mjs`, `.claude-plugin/marketplace.json`.

**Verify.** In isolated default and custom Claude homes, resolve the marketplace using the actual native client. Recover after withdrawal, retaining unrelated enabled plugins and prior selections. Reject replaced caches or edited owned source. Verify the retained PS identity.

**Excludes.** Real client rollout, publication or deleting compatibility paths.

## LAY-17C — Qualify Pi upgrades across package layouts

Status: open

Blocked by: LAY-14, LAY-16

Acceptance criteria: AC-07, AC-09

Prerequisite evidence. LAY-14 supplies relocated production installer. LAY-16 supplies candidate Pi package tree.

**Outcome and scope.** Exercise old pi/packages and new dist/pi through native fresh install, upgrade, interrupted repair and rollback. Cover linked settings, saved selection, alternate homes and immutable direct-checkout identity.

**Starting points.** `scripts/clean-install-skills.mjs`, `tests/pi-package-projection.test.mjs`, `tests/managed-skill-input.test.mjs`.

**Verify.** In isolated Pi homes preserve the settings link and original target, unrelated packages, backup and frozen journal bindings after recovery. Prove a same-name foreign suffix or modified old source cannot authorize removal.

**Excludes.** Real client rollout, publication or updating original PS digests.

## LAY-18 — Switch active distribution and verify the repository layout

Status: open

Blocked by: LAY-13, LAY-17, LAY-17B, LAY-17C

Acceptance criteria: AC-05, AC-06, AC-07, AC-09, AC-10

Prerequisite evidence. LAY-13 supplies relocated authoring/build tooling. LAY-17 supplies qualified installer with candidate host trees. LAY-17B supplies Claude upgrade and rollback proof. LAY-17C supplies Pi upgrade and rollback proof.

**Outcome and scope.** Switch the default generator and installer to dist, update root guidance and active manifests, retire obsolete active output and tooling paths after a caller sweep. Record every retained compatibility file or root with its consumer and exit condition. Keep old journals/receipts readable.

**Starting points.** `README.md`, `AGENTS.md`, `docs/architecture.md`, `scripts/sync-codex-plugin.mjs`, `scripts/validate-skill-release.mjs`, `tests/adoption-projection.test.mjs`.

**Verify.** From a clean candidate checkout run the integration gates in the spec, including the full host matrix. Compare actual root tree to the documented five active roots plus compatibility exceptions. Exercise prior-tag fallback and rollback. Show that publication/install into real homes did not occur. Interrupt one combined multi-host attempt and prove safe per-host retry.

**Excludes.** Removing legacy migration payloads or waiting on optional evidence storage.

## LAY-19 — Remove only the four verified capture parts

Status: open

Blocked by: LAY-03

Acceptance criteria: AC-08

Prerequisite evidence. LAY-03 supplies independent restoration and retention evidence for both archives.

**Outcome and scope.** Keep the local manifests, hashes, verified retrieval instructions and both verifier programs. Remove the four archive chunks only when the independently recoverable source is durable. Use disposable restored inputs for archive checks.

**Starting points.** `tests/fixtures/frontend-adoption-v3-results`, `tests/fixtures/frontend-mobile-repair-results`, `docs/validation/frontend-adoption.md`.

**Verify.** From the resulting tree run offline ordinary tests and an isolated install with archive retrieval disabled. Restore both archives on demand, verify all 3,955 files and their manifest directory entries, and report actual tracked bytes removed. Interrupted retrieval leaves no partial valid archive. If retention is unresolved, keep the parts and mark this ticket blocked.

**Excludes.** History rewriting, moving other fixtures or exporting evidence to a third party.

## LAY-20 — Verify the combined layout and evidence delivery

Status: open

Blocked by: LAY-18, LAY-19

Acceptance criteria: AC-08, AC-10

Prerequisite evidence. LAY-18 supplies integrated developer/host layout. LAY-19 supplies independently verified lean evidence checkout.

**Outcome and scope.** On the combined revision check the onboarding walkthrough, root inventory, supported compatibility paths and archive-free default install. Report exact version, revision, supported-host evidence and scope of any skipped platform checks.

**Starting points.** `docs/contributing.md`, `docs/validation/frontend-adoption.md`, `package.json`, `tests/install-skills.test.mjs`.

**Verify.** Run sync then check then npm test, strict Claude validation, all targeted isolated host/upgrade probes and git diff --check. Compare clean regeneration and current vs historical bindings. Confirm docs walkthrough and both explicit archive restores work. Close the overall graph only with evidence for both tracks.

**Excludes.** Publishing, production rollback, benchmarking Git history size or deleting compatibility exceptions.
