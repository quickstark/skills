# Managed Claude updater evidence

The isolated native tests cover Claude alias normalization, fresh core selection,
optional additions, saved selection, interrupted-install resume, same-selector
version changes, exact backup recovery, custom Claude/Pi environment profiles and
a combined Codex/Claude/Pi transaction. No model turns are submitted. All mutation
is confined to temporary fixture homes; the user's installed hosts are unchanged.

`regression.log` records ten passing focused tests. `resume-host.log` verifies
that journal resume rejects a different host selection. `legacy.log` verifies
migration of the original immutable PS 3.8.0 Claude payload to accepted QS packages. `discovery.log` records strict
validation and actual installation of all six maintained Claude projections,
followed by native SDK initialization in an otherwise empty workspace. The native
command list matches all 39 expected package-qualified public commands, without
private modules or retained PS commands. This checks discovery, not model behavior.
The test sources are `tests/migration-native-packages.test.mjs` and
`tests/managed-skill-input.test.mjs`.

The Claude copier recreates directory permissions under the destination umask.
Claude package identity therefore uses Git content and owner executable-bit
semantics, while local source revalidation and transaction backups retain full
filesystem snapshots. Claude's numeric `.orphaned_at` file is recognized only in
inactive, retained caches. For compact packages, every other cache path, file byte
and executable bit must match the bound payload.

The new Claude host checks reuse the existing reviewed acceptance of unchanged
canonical workflow behavior, notices, video and execution closures. Native
transaction/discovery and projection validation have new evidence here; no new
model-behavior trials, publication or machine rollout are claimed. Linux with
Node 24 and Claude Code 2.1.309 was exercised. Windows/macOS native manager behavior,
remote marketplace transitions, project/local-scoped managed registrations and
older root-based Claude caches without matching immutable local Git history remain
outside this evidence.

`reviewed-defects-before.log` retains the three failing regression cases before
repair; it is diagnostic evidence, not a passing acceptance result.
`reviewed-defects-after.log` records six passing native regressions after repair:
concurrent settings edits during recovery, upgrade from the previous root-based
core layout, rejection of edited public skills and private resources, interrupted
withdrawal with resume and rollback, and refusal to overwrite a same-version cache.
Recovery validates the original raw settings/metadata snapshots after inventory
and immediately before restoration, then restores files through synced atomic
replacement. Concurrent edits remain intact and require reconciliation.

The root-cache fixture installs the former marketplace source (`./`) at version
4.0.0 using the real Claude CLI, then switches the release to the compact core at
4.1.0. Ownership matches the manifest and declared public/private closure against
at most 32 immutable local manifest revisions. The new bounded helper is
`scripts/claude-core-migration.mjs`. It never traverses or copies unrelated root
cache files, including a deliberately dangling symlink in this fixture. Native
withdrawal/rollback changes only registration metadata and the orphan marker;
the previous cache remains available. Exact declared bytes are revalidated on
resume, and edited or unknown closures block before native changes.


`rollback-resume-before.log` reproduces the reviewed P2: stopping after settings
restoration makes the next recovery attempt fail against the mixed native state.
The two concurrent-edit controls already pass before repair; this log is diagnostic
evidence, not a passing acceptance result. `rollback-resume-after.log` records the
focused native/coordinator and root-cache regressions after repair. A child process
stops after the first atomic settings replacement; a new adapter in the parent
process resumes solely from the durable journal and backup. Other cases preserve
edits to restored settings or pending metadata, reject altered recovery receipts,
and resume interruption during deletion of an owned newly exposed cache.

The coordinator syncs the recovery receipt's digest into recover-intent before
restoring a target. The separate immutable receipt binds raw after-state snapshots,
backup identity, payload closure, release sources and marketplace metadata. Retry
accepts only original or restored targets, plus unchanged remaining entries of a
cache whose removal had begun. Unexpected files or changed bytes block mutation.
Forward execution remains blocked while recovery is pending. Retained cache
payloads are preserved and only their orphan marker is restored; new-cache removal
deletes recorded paths individually so an unexpected added file is retained.

Restoration reuses the exact target snapshots that passed receipt validation and
revalidates them before replacing files. It does not adopt a fresh snapshot as the
baseline between inspection and restoration. The same rule applies to retained
cache markers, whose enclosing cache is revalidated after marker inspection.


`unrelated-recovery-before.log` records the failing drift guards before repair;
its unchanged-plugin control passes. `unrelated-recovery-after.log` records the
passing focused checks after repair. The native fixture installs a second plugin,
then excludes it from the managed package bindings. A child process interrupts
rollback between settings and metadata restoration. Unchanged unrelated payloads
permit retry; edited body bytes or a changed skill name block retry before any
owned target changes. An uninspectable active unrelated payload blocks recovery
preparation before a recover-intent is written. The tests retain the unrelated
payload bytes and compare every owned file/cache snapshot across blocked retries.

Claude inventory retains the original unrelated payload snapshots used for skill
discovery and revalidates them after inventory. Recovery binds those snapshots into
its immutable evidence rather than taking a new baseline after inspection. This
covers active unrelated plugins without adding them to the mutation footprint.
