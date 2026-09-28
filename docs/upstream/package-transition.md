# Legacy package discovery during the QS migration

The target catalog has six QS packages. The old `ps-skills` package is retained
separately as a migration artifact, with its existing name, version and payload.
It is excluded from fresh/default selections and from the target command catalog.
After migration, selected PS outcomes are provided by `qs-advanced` and Help by
`qs-help`; the updater withdraws old commands before exposing their replacements.

Keeping the old native identity temporarily is necessary. An isolated check with
Codex 0.153.4 removed a legacy marketplace entry while retaining its enabled cache.
`codex plugin list --json` then returned no installed entry. This would hide the
state that the updater must verify and retire. Pi additionally reads its configured
package directory directly, so deleting or regenerating that directory would
change users' discovery before their update transaction.

[Transition metadata](../../config/skill-transition-packages.json) records the
exact retained directories, source revision, version and complete content hashes.
[Migration records](../../config/skill-migrations.json) distinguish the original
released 3.8.0 baseline from the verified task-built transition snapshot at
`86bac7dd82fe3812c9b459cc6bfa7454df9aa3ac`. A direct checkout's changed bytes are
never represented as the original release digest.

When the target catalog activates, marketplaces retain a marked legacy entry so
existing native registrations remain observable. New setup uses the QS catalog.
The retained artifact is not another current package, a QS alias, or a new selected
command. Its pinned historical version is excluded from current registered-package
version synchronization. Candidate installations copy it unchanged; the active
checkout verifies it without regeneration. A changed payload fails verification
and is preserved for inspection.

Do not remove this compatibility artifact merely because one machine migrated.
Its later retirement requires evidence that remaining supported consumers can
still be identified and migrated safely. Local retirement continues to require
current ownership, path/content checks, replacement acceptance and a journaled
transaction; the presence of this artifact grants no deletion authority.
