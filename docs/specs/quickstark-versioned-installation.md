# Versioned QuickStark installation

Status: [4.4.6 published](https://github.com/quickstark/skills/releases/tag/v4.4.6) on 2026-11-05 at `fab40148cffd0c1ef3e0de6b4d44bc91bd411ca3` through [release.yml run 42105077560](https://github.com/quickstark/skills/actions/runs/42105077560). Installed-device verification remains separate and unverified.

## Required behavior

The repository owner selected published version tags as the ordinary update source.
Installation must work on macOS and Linux without querying or waiting for GitHub
Actions. The owner subsequently removed hosted test gates from publication too:
this repository distributes skills to local machines. Hosted tests are manual.

- Select the highest stable `vMAJOR.MINOR.PATCH` tag from the official repository,
  ordered numerically; ignore prereleases. An explicit `--version` may select a
  published stable version. Resolve annotated tags to their commit.
- Pin one tag, version and commit through checkout preparation and native update.
  Require root/generated versions to match. Moving `main` must not invalidate it.
- Verify actual checkout bytes and executable bits, local generated projections
  and replacement acceptance before native removal. Preserve package choices,
  unrelated plugins/settings, custom-home isolation and original QuickStark backups.
- Ordinary updates clean-reinstall only known QuickStark packages through native
  managers. Remember the desired selection before removal, replace same-version or
  edited managed caches, and verify installed registrations and package payloads.
  Retain old sources, backups and historical journals without inspecting them as
  prerequisites. Never traverse unrelated plugin caches during this ordinary path.
- Attempt selected clients independently. A failed client must not prevent other
  selected clients from installing. A plain rerun restores the desired selection;
  ordinary installation creates no migration journal or pending repair pointer.
- Keep the historical transaction engine for explicit journal recovery and direct
  migration callers. The continuation and frozen-journal requirements below govern
  that retained engine, rather than the ordinary clean-installation path.
- Reject automatic downgrades and different source under an existing version.
  Dirty managed checkouts may be replaced only with a retained original backup.
- Support Pi settings stored behind a symbolic link to an existing bounded regular
  file. Preserve the link separately from its physical write target and back up
  the target. The historical engine also freezes the binding in repair receipts
  and transaction journals. Keep relative package resolution at the logical configuration directory.
  Reject changed links, changed planned targets and invalid targets before effects;
  retain the existing strict policy for package payloads and other metadata.
- Resume a versioned transaction at its original published tag and commit, not the
  latest version. Preserve legacy journals that cannot be matched to a versioned
  source; do not silently reinterpret them.
- The retained historical repair engine may continue a `prepared-for-install` repair in a
  newer recorded official release. Verify both retained physical sources, their
  Git ancestry, matching agent homes, the frozen selection and original backups.
  Validate replacements and retain fresh live-state backups before creating a
  linked successor receipt. Preserve the predecessor receipt and transaction
  journal unchanged; this is a new repair, not a reinterpretation of that journal.
  Reject missing evidence, drift, unsupported repair states and profile changes
  before native effects. Retry an interrupted successor from its own receipt.
- Recognize both single-quoted and double-quoted owned Codex plugin table keys,
  with the same strict enablement and duplicate checks. A receipt that failed
  after its first attempted Codex withdrawal with the historical unrelated-state
  error may also receive a newer-release successor, only when its bound original
  configuration proves that package had single-quoted enabled settings. Retain
  every existing source, ancestry, profile, selection and backup check. Re-inventory
  current state and create fresh backups; never replay the failed action or
  rewrite the predecessor. Other failed repair states remain unsupported.
- Publish only by explicit dispatch of `release.yml` on main. Create the exact
  version tag and GitHub release directly, without depending on hosted test jobs.
  Keep Linux/macOS tests available through manual dispatch of `validate.yml`.
  Retries must not move an existing tag. Preserve local installation integrity,
  ownership and package checks.

The first version containing this installer is 4.4.1. Existing v4.4.0 predates its
entry points and several engine repairs; this change must be published in a new
version rather than replacing v4.4.0 in place.

## Verification

`tests/install-skills.test.mjs` exercises real temporary Git tags/checkouts and
isolated publisher retries. Existing updater/native tests cover host selection,
ownership, acceptance, custom homes and recovery. Required repository checks remain
`npm run sync:codex`, `npm run check:codex`, `npm test` and available strict Claude
package validation. Local test success is separate from publication and installed
Mac/Linux acceptance.

Versioned sources stay at their original physical paths. The current convenience
link is separate from native registrations and frozen journals; another profile
can install a newer version without moving the earlier source. Edited prior roots
are retained rather than overwritten. Resume tests use real hash-chained journals
and actually install a newer source before recovering the original version.
