# Versioned installer repair review

## Governing decision

The owner selected the latest published version tag for ordinary updates, with
new installer fixes included in the next version. This supersedes the earlier
installer policy requiring successful live CI for every latest-main checkout.
The implementation is prepared as 4.4.1; this record does not publish it or claim
installation on a real Mac/Linux profile.

The prior main-CI implementation blocked commit
`7bb12a3ea803db7b5879b41ef34a299bf7066290` when GitHub could not allocate a macOS
runner. Linux validation passed, while the Mac job had no runner or executed steps.
The gate rejection was reproduced from the workflow API response. The prior
17 installer tests passed, demonstrating that the old policy itself was the
problem; retrying CI did not repair the owner's version-based update requirement.

## Reviewed changes

- Select stable numeric version tags, peel annotated tags and pin one commit.
  Do not query GitHub Actions from installation or fall back to mutable main.
- Match tag/package versions, reject automatic downgrade and same-version
  different source, and retain dirty managed-checkout backups.
  Initial migration also compares the legacy owner's recorded commit/version;
  an older release or different source under the same version cannot reach
  native effects. The old physical source and ownership provenance are retained.
- Verify official origin, pinned tag, clean checkout, actual bytes and executable
  bits at the native transaction boundary. Preserve package acceptance, profile
  isolation, ownership and frozen recovery checks.
- Resume a versioned checkout at its original tag after a newer publication.
  Legacy unversioned journals require their original verified source.
- Strip inherited Git overrides from installer child processes without stripping
  ordinary authentication or the existing native workload-identity protections.
- Synchronize the root, lockfile and all six active host projections at 4.4.1.
  Changes to generated manifests are version-only; the PS 3.8.0 payload is unchanged.
- Explicit publication reuses the Linux/macOS validation matrix before creating
  the exact tag and GitHub release. Repeated publication preserves an existing tag
  and refuses a different source commit. No workflow was dispatched by this repair.

## Evidence and limits

The focused regression file uses real temporary Git repositories and real
annotated/lightweight tags for selection, main advancement, numeric ordering,
prerelease exclusion, version mismatch, moved tags, downgrade, hidden edits,
backups and resume. Publisher tests run the workflow's actual shell body against
an isolated bare Git remote and a synthetic GitHub-release client; they assert
the exact tagged commit, idempotent retries and refusal to move an existing tag.
Existing native tests separately verify the host adapters and recovery behavior.
The legacy downgrade regression failed before its guard and passed afterward;
upgrade coverage verifies dirty legacy-source retention and provenance without
making that old directory a dependency of future versioned updates.

The acceptance refresh is limited to reviewed source/evidence bindings affected
by this repair and version-only projection changes. Historical trial results,
criterion decisions and installed-host results remain unchanged. Local tests
cannot establish publication or actual Mac/Linux installed-profile acceptance.

Versioned sources stay at their original physical paths. The current convenience
link is separate from native registrations and frozen journals; another profile
can install a newer version without moving the earlier source. Edited prior roots
are retained rather than overwritten. Resume tests use real hash-chained journals
and actually install a newer source before recovering the original version.
