# Central skill control plane

Use the [installation guide](./install-and-update-skills.md) for normal updates.
The target updater applies a saved or explicitly selected set, not every package
and resource in the repository. Source preparation is not an installed-state claim.

## Ownership and selection

QuickStark canonical roots and private dependencies live in this repository;
generated host packages are projections. Approved third-party resources are pinned
in [the contributor manifest](../config/personal-skills.manifest.json). Installed
machine inventory is evidence, never upstream approval or authority to adopt.

[Profiles](../config/skill-profiles.json) define fresh core-only selection.
[Migrations](../config/skill-migrations.json) preserve stable original capability IDs
and map accepted replacements. Machine selection lives at
`~/.config/quickstark/skills-selection.json`. Ordinary updates preserve it;
`--with <package-id>` adds explicitly and `--profile core` starts a new desired
selection. Unknown packages, ambiguous ownership and capability expansion block.
Dropping a selected name does not authorize deletion.

Target transactions support Codex and Pi only. Claude projections and historical
inventory/link support do not constitute a verified Claude native transaction.
Do not pass Claude to the selected updater or fall back to its legacy all-package
path. Portable selected resources remain under `~/.agents/skills`; native package
state remains owned by Codex or Pi. Never copy system skills or plugin caches into
the canonical tree.

## Plan, save and recover

```bash
npm run skills:plan -- --json --agent codex --agent pi
npm run skills:update -- --agent codex --agent pi
```

The selected updater verifies the exact repository revision, active manifest
versions, package acceptance receipts, native inventory, exposed names, paths,
ownership and content identities before mutation. Update checks HEAD against a
non-mutating `origin/main` query. Plan and verification do not converge state.
The exclusive `.quickstark-skills-update.lock` protects mutation; journal and backup
directories live under `~/.local/state/quickstark/`.

Accepted replacement payloads are staged and verified before retired discovery is
withdrawn and replacements exposed. Selection and ownership state are saved only after
verification. Failed transactions retain their journal, backups and exact residuals;
they do not automatically compensate. Ordinary `--resume` continues the frozen
forward plan against its verified home/repository/revision, without new selection
flags. Restoring a prior release or journaled effects requires separately verified,
transaction-specific recovery authority; no automatic rollback is promised.
Do not steal a lock, delete an unrelated path or silently broaden packages to
bypass a conflict.

The [retained PS artifact](./upstream/package-transition.md) keeps old native
registrations observable during migration. Its pinned 3.8.0 payload is excluded
from active-version synchronization. Preserve source names, original revisions,
notices, historical dispositions and many-to-one mappings; they are provenance,
not invocation aliases.

## Contributor curation

Manifest schema 2 supports `agent-skill` and `pi-package` resources. Agent skills
bind immutable revision, license evidence, upstream tree and independent content
SHA256. Pi packages bind an exact npm version plus SHA512 integrity, or an exact
Git commit, together with license and contributed-skill path/hash evidence.
Schema 1 is accepted through lossless in-memory migration. The separate Skills CLI
installer remains integrity-pinned by [its lock](../config/personal-skills-installer-lock.json).

Inventory is read-only and reports managed, candidate, alias, conflict, ignored,
separately-managed or unresolved state. It scans supported discovery/configured
paths within the selected home, records a state token and omits unrelated settings
and credentials. Native caches and built-ins are not adoption candidates.

```bash
npm run personal-skills:inventory -- --json
```

Adoption requires one explicit live candidate and the current inventory state
token. It re-inventories, validates the immutable source/license/content and changes
only the manifest; it does not install the resource. Do not adopt a familiar name
or a stale inventory report as ownership proof. For example:

```text
npm run personal-skills:adopt -- --candidate agent-skills:example --state-token <current-token> --type agent-skill --license MIT --license-path LICENSE --agent codex --agent pi
```

Exact npm archives are staged with approved integrity and no lifecycle execution;
unsafe paths, links, special entries and oversized payloads fail. Git sources use
an immutable commit. Contributor selection is separate from provenance approval:
an approved manifest entry does not automatically join an ordinary target update.

The lower-level `personal-skills:plan`, `personal-skills:sync` and
`personal-skills:verify` operate on their selected manifest/resources and are
contributor-only tools, not a substitute for the saved-selection migration.
Do not run them as an all-resource repair of a target selection. The reconciler
replaces only clean previously managed bytes, preserves edited/unowned content,
and journals its canonical paths and exact lock before compensation.

Third-party Pi packages may carry executable extensions or lifecycle behavior.
The resource reconciler proposes an exact pinned native action but does not execute
it automatically. That action needs separate authorization; subsequent verification
checks settings pin, package identity and all contributed hashes. Ordered filters
and disabled approved skills remain explicit policy evidence, not permission to
reenable them silently.

## Boundaries

`skills:update` and authorized `skills:sync` mutate selected machine state;
`personal-skills:sync` mutates its separately reviewed contributor scope. Inventory,
plan and verify commands do not mutate discovery. Adoption changes repository
desired state only. None of these commands authorizes fleet operations, arbitrary
global packages, credentials/sessions, dotfiles, package-manager settings outside
the journaled scope, provider acquisition or publication.

The [upstream record](./upstream/README.md) distinguishes reviewed, adopted, pinned
and unknown status. New source bodies and successful fixture checks do not replace
package acceptance or installed-host verification.
