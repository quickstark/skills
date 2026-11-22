# Repository tooling

Run npm commands from the checkout root. Checkout tools resolve source paths relative to their own module locations.

| Directory | Responsibility | Commands |
| --- | --- | --- |
| catalog | Collection membership, upstream provenance and dependency records | Consumed by the generators and release checks |
| generation | Project host packages, render docs, synchronize skill contracts and maintain development links | npm run sync:codex, npm run check:codex, npm run sync:outputs, npm run check:outputs, npm run sync:upstream, npm run check:upstream |
| verification | Test environment, hermetic suite, structural validation and acceptance checks | npm test, npm run test:preflight |
| trials | Reproduce the research and behavior trials used by acceptance records | Run the relevant trial module directly |
| install | Managed installation, migration, selection, recovery, personal skills and host restart | npm run skills:plan, skills:update, skills:sync, skills:verify and personal-skills:* |
| release | Validate a tagged checkout and its replacement evidence | Invoked by the standalone installer |

## Published entry points

The root install.sh downloads scripts/install-skills.mjs on its own. That file must work from an empty directory with only Node and Git. It resolves a published tag and runs these regular files in the independently verified physical checkout, in order.

1. scripts/sync-codex-plugin.mjs --check
2. scripts/validate-skill-release.mjs followed by the checkout path
3. scripts/update-skills.mjs --release followed by the tag and revision

Published bootstraps dating back to v4.4.1 use those filenames. The installation guide invokes `scripts/managed-skills.mjs` and the root README invokes `scripts/list-skills.sh`. Keep the bootstrap and its dispatch files while their published URLs or supported callers reference them. Retire a compatibility entry only after its remaining callers have migrated. The restart command in the installation guide downloads a specific historical Git blob.

The manual validation workflow uses the root npm aliases. Release automation reads the root package version and tags the selected revision. Changesets uses npm run changeset and npm run version. Catalog support modules shipped inside the host packages retain their package-local scripts directory.

## Replaying a historical trial

Match the runner and input hashes recorded with the trial before replaying it. The native frontend orchestrator controls, for example, record their inputs in `tests/fixtures/frontend-adoption-v3-controls/evidence.json`. Use `tooling/trials/` for new runs.

## Stage the distribution layout

Run the following command with the physical path to an official pre-cutover QuickStark checkout and its independently trusted full release commit. It prints a new temporary directory containing the six active packages under each of `dist/claude/`, `dist/codex/` and `dist/pi/`. The three PS 3.8.0 packages keep their original paths.

```sh
node tooling/generation/stage-distribution-layout.mjs <physical-checkout> <trusted-commit>
```

The staging command checks each package’s native manifest, bytes and executable bits at that revision. Ordinary package generation now writes `dist/`. Tagged installers still resolve the layout shipped in their selected release.

## Generate a candidate with marketplace entries

Generate into a new directory under the system temporary directory. This mode uses the canonical skill sources and writes all 18 packages plus the candidate marketplace files.

```sh
node tooling/generation/sync-codex-plugin.mjs --candidate --layout dist --output-root "$candidate"
node tooling/generation/sync-codex-plugin.mjs --candidate --layout dist --output-root "$candidate" --check
```

In the candidate checkout, register its root as the Claude or Codex marketplace. Codex reads `.agents/plugins/marketplace.json`, Claude reads `.claude-plugin/marketplace.json`, and Pi takes each `dist/pi/<package>` as a local package source. The marketplace entries for PS still point to the retained original paths.

For a candidate Git snapshot, force-add the generated `dist/` directory and both root marketplace manifests if ignore rules apply. Generate a second fresh directory to compare output. Pass `--layout original` to reproduce the historical package layout in a disposable directory.

## Qualify the Codex upgrade

Use a disposable Codex candidate with the staged root marketplace and `dist/codex/` payloads, and bind its release audit to those checked-in paths. The candidate must contain the trusted prior release in its Git history. Keep the retained PS package at `codex/plugins/ps-skills`. The qualifier binds a private local tag to the candidate commit and exercises the production updater in disposable Codex homes.

```sh
node tests/qualify-codex-layout-upgrade.mjs "$candidate" "$prior" fresh
node tests/qualify-codex-layout-upgrade.mjs "$candidate" "$prior" upgrade
node tests/qualify-codex-layout-upgrade.mjs "$candidate" "$prior" journal
```

The fresh and upgrade probes exercise the ordinary updater entry point. The journal probe tests the frozen transaction for the retained PS package under the candidate marketplace. The prior checkout supplies the v4.4.7 release.

## Qualify Claude Code against the staged layout

Use a disposable checkout with the staged root Claude manifests and `dist/claude/` packages checked in. Keep `packages/ps-skills` at its original path and bind the candidate release audit to the staged paths. The checkout must contain the trusted v4.4.7 and v4.0.0 releases. Run with the native `claude` CLI available.

```sh
node tests/qualify-claude-layout-upgrade.mjs "$candidate" fresh
node tests/qualify-claude-layout-upgrade.mjs "$candidate" upgrade
node tests/qualify-claude-layout-upgrade.mjs "$candidate" root-upgrade
node tests/qualify-claude-layout-upgrade.mjs "$candidate" journal
```

The upgrade probes exercise the updater from the v4.4.7 package directory and the v4.0.0 repository-root core. The journal probe advances the disposable v4.0.0 checkout to the candidate at the same marketplace path, then tests retry and rollback of the frozen package transaction.

## Qualify Pi against the staged layout

Use a disposable checkout with the staged `dist/pi/` packages checked in. Keep `pi/packages/ps-skills` at its original path and bind the candidate release audit to the staged paths. The checkout must contain the trusted v4.4.7 release. Run with the native `pi` CLI available.

```sh
node tests/qualify-pi-layout-upgrade.mjs "$candidate" fresh
node tests/qualify-pi-layout-upgrade.mjs "$candidate" upgrade
node tests/qualify-pi-layout-upgrade.mjs "$candidate" journal
```

The upgrade probe tests a clean reinstall and retry from the original Pi package paths. The journal probe tests retry and rollback with both checkouts available and the target of a settings symlink bound to the transaction.
