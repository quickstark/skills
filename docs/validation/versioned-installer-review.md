# Versioned installer repair review

## Governing decision

The owner selected the latest published version tag for ordinary updates, with
new installer fixes included in the next version. This supersedes the earlier
installer policy requiring successful live CI for every latest-main checkout.
After hosted macOS allocation failed during publication, the owner also removed
hosted tests from the publication path. Publishing now creates a version tag and
GitHub release directly; Linux/macOS tests remain available as a manual workflow.
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
- Explicit publication creates the exact tag and GitHub release without a hosted
  test dependency. Validation runs only when separately dispatched. Repeated
  publication preserves an existing tag and refuses a different source commit.

## Evidence and limits

The focused regression file uses real temporary Git repositories and real
annotated/lightweight tags for selection, main advancement, numeric ordering,
prerelease exclusion, version mismatch, moved tags, downgrade, hidden edits,
backups and resume. Publisher tests run the workflow's actual shell body against
an isolated bare Git remote and a synthetic GitHub-release client; they assert
the exact tagged commit, idempotent retries and refusal to move an existing tag.
They also assert that publishing has no test dependency and hosted validation
has only a manual trigger.
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

## Prepared repair continuation in a newer release

The 4.4.2 publication fixed commented Codex enablement but left an ordinary update
unable to finish a pending 4.4.1 repair: the latest source was selected correctly,
then the repair loader rejected its predecessor's physical checkout. The earlier
native regression retried from the same source and did not cover that transition.
The new regression first performs a real isolated Codex/Pi repair at 4.4.1, then
injects the reported legacy parser error after a real native add, leaving a valid
failed transaction journal and `prepared-for-install` receipt. Updating from a
separate 4.4.2 descendant checkout reproduced the exact source/group rejection.
With the repair it completes both agents, preserves saved optional packages and
unrelated settings, and leaves the original receipt, backups and journal unchanged.

Only installer-authorized updates can request this continuation. Both sources must
appear in the same official versioned-source ledger at their original physical
paths, have matching Git revisions and checkout bytes, and have increasing versions
with the old commit in the new commit's history. The predecessor must be prepared
for install, match the selected agents and homes, retain its bound selection and
have intact original backups. The normal strict repair lookup and frozen journal
resume rules remain unchanged. Missing or edited sources, backup drift, other
profiles, unrelated history and selection changes are rejected before native
effects. Replacement acceptance is checked before changing the pending pointer.

The expanded retry fixture also places an unrelated project table before the
commented plugin and a full-line comment after its enablement setting. Codex
retains that trailing comment when removing the plugin table. This reproduced a
second failure in the repair's unrelated-state check after the source handoff was
fixed. Repair now tracks full-line comments by their following entry or end of
file, matching native TOML editing and the existing package adapter. The regression
requires the project settings and retained trailing comment to survive the full
update; unrelated configuration is not globally excluded from preservation checks.

The successor records its predecessor path and content digest, retains fresh
live-state backups, and revalidates predecessor evidence before replacing the
pointer. An interruption after native withdrawal reports the successor receipt;
an ordinary retry finishes with the frozen selection. Completing the successor
clears only its matching pending pointer. It does not rewrite or execute the old
transaction journal. These are isolated Linux tests, not acceptance on the
reported Mac. A new version is required to publish the engine repair; existing
4.4.1 and 4.4.2 tags must remain unchanged.

## Single-quoted Codex table keys on dirk-dev

The reported 4.4.3 repair failed after its first attempted withdrawal of
`qs-specialists@quickstark` with Codex 0.165.0 and Node 24.21.0 on Linux. A
read-only comparison of the retained original and current TOML found unchanged
unrelated semantic settings, no comments, and a changed repair text projection.
The original owned table used a single-quoted key. Both the repair projection
and native state parser recognized only double-quoted plugin keys.

An isolated native regression reproduced the exact unrelated-state error with
that single-quoted table. The correction recognizes both TOML quoting forms for
the same literal package keys; it retains strict boolean enablement, duplicate
detection, unknown-field rejection and unrelated configuration/cache bindings.
Native tests require successful Codex/Pi repair, intact original configuration
backups and vendor caches, and rejection of actual unrelated settings or payload
changes after withdrawal. No general TOML parser or inline-table support is added.

A parser fix alone would strand the already-failed receipt when a newer release
is selected. Continuation therefore also admits the narrow historical signature:
schema 1, the exact unrelated-state error, exactly one attempted Codex withdrawal
of a known package, and a bound original configuration proving that package was
enabled under a single-quoted header. All official retained-source, version,
ancestry, home, frozen-selection and backup validation still applies. The successor
re-inventories live state and retains fresh backups; the old receipt, backups and
transaction journal remain unchanged. Other statuses/errors, later effects,
missing original quoting evidence and changed backups are negative regressions.

Separately, a temporary checkout of published 4.4.3 at
`330a913014cf4c0296659d98572bc85b24060e0d`, using Codex 0.165.0, verified an
operator workaround: remove only the known QuickStark Codex selectors through the
native CLI, then perform an ordinary same-version update. Both agents completed,
the original backup payloads and prior journal remained intact, and the same-source
repair receipt was retained and marked complete. This isolated result does not
prove acceptance on dirk-dev; no real installed profiles were modified here.

## 4.4.4 preparation

The single-quoted Codex-header repair and narrowly bound failed-repair
continuation are prepared for 4.4.4. Root and lockfile versions, the root Claude
manifest and all six active packages across Codex, Claude and Pi are synchronized.
The retained PS 3.8.0 transition artifact remains unchanged. Publication and
installed-profile updates are separate from this preparation.

The operator subsequently reported that the published 4.4.3 cleanup and retry
completed on dirk-dev: Codex updated and verified three packages, and Pi updated
and verified one package. That confirms the workaround on the affected host;
it does not establish installation acceptance for the unpublished 4.4.4 repair.
