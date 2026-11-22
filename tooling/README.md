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

Published bootstraps dating back to v4.4.1 use those filenames. The direct scripts/managed-skills.mjs CLI and scripts/list-skills.sh remain available to existing callers. The restart command in the installation guide downloads a specific historical Git blob.

The manual validation workflow uses the root npm aliases. Release automation reads the root package version and tags the selected revision. Changesets uses npm run changeset and npm run version. Catalog support modules shipped inside the host packages retain their package-local scripts directory.

## Replaying a historical trial

Match the runner and input hashes recorded with the trial before replaying it. The native frontend orchestrator controls, for example, record their inputs in `tests/fixtures/frontend-adoption-v3-controls/evidence.json`. Use `tooling/trials/` for new runs.

## Stage the distribution layout

Run the following command with the physical path to an official QuickStark checkout containing all six active packages and an independently trusted full release commit. It prints a new temporary directory containing the six active packages under each of `dist/claude/`, `dist/codex/` and `dist/pi/`. The three PS 3.8.0 packages keep their original paths.

```sh
node tooling/generation/stage-distribution-layout.mjs <physical-checkout> <trusted-commit>
```

The staging command checks each package’s native manifest, bytes and executable bits at that revision. Ordinary package generation and installation still use the existing layout.

## Generate a candidate with marketplace entries

Generate into a new directory under the system temporary directory. This mode uses the canonical skill sources and writes all 18 packages plus the candidate marketplace files.

```sh
node tooling/generation/sync-codex-plugin.mjs --candidate --layout dist --output-root "$candidate"
node tooling/generation/sync-codex-plugin.mjs --candidate --layout dist --output-root "$candidate" --check
```

In the candidate checkout, register its root as the Claude or Codex marketplace. Codex reads `.agents/plugins/marketplace.json`, Claude reads `.claude-plugin/marketplace.json`, and Pi takes each `dist/pi/<package>` as a local package source. The marketplace entries for PS still point to the retained original paths.

For a candidate Git snapshot, force-add the generated `dist/` directory and both root marketplace manifests if ignore rules apply. Generate a second fresh directory to compare output. Ordinary sync commands continue to use the original paths.
