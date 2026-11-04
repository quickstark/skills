# Versioned QuickStark installation

Status: prepared for 4.4.1; not published or deployed by this change.

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
- Verify actual checkout bytes and executable bits, local generated projections,
  package acceptance, ownership and replacement checks before native effects.
  Preserve saved selections, unrelated packages, custom-home isolation and backups.
- Reject automatic downgrades and different source under an existing version.
  Dirty managed checkouts may be replaced only with a retained original backup.
- Resume a versioned transaction at its original published tag and commit, not the
  latest version. Preserve legacy journals that cannot be matched to a versioned
  source; do not silently reinterpret them.
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
