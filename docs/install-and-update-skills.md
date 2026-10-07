# Install and update QuickStark skills

This guide describes the six-package target updater. Selection options require
the target registry; an older checkout using the legacy updater rejects
`--profile`, `--with` and `--resume`. Do not use documentation alone as
proof that a target package is accepted or installed.

The target native transaction supports Codex and Pi. Choose only installed hosts;
Pi means the coding-agent harness. Claude package projections are generated, but
the target updater rejects `--agent claude-code` until a separately verified native
transaction adapter exists. It must not silently fall back to the legacy updater.

## Selection and the repository template

Updates move from a verified repository checkout to one machine. They do not copy
installed caches back into Git, synchronize machines, or adopt upstream changes.
The six packages are core `qs-skills` (12 roots), `qs-specialists` (8),
`qs-advanced` (12), `qs-frontend` (4), `qs-video` (1) and `qs-execution` (1).

| Situation | Selection |
| --- | --- |
| Fresh machine, no selection flags | `qs-skills` only; no standalone resources |
| Saved machine, no selection flags | Saved packages and resources for each selected host |
| Previously managed machine without saved selection | Verified ownership/capability migration preview; ambiguous or expanded exposure blocks |
| `--with <package-id>` | Explicit addition to the current selection; repeat for multiple additions |
| `--profile core` | Explicit desired core selection; reduction is not deletion authority |

`--agent` selects a host independently of package selection; its default is Codex.
The implemented addition flag is `--with`, not `--with-package`. Unknown IDs and
duplicate additions fail. New optional packages do not join an ordinary update.
The selection file is `~/.config/quickstark/skills-selection.json`; it is saved
only after the transaction succeeds. Do not edit it to bypass a migration conflict.
For a non-default Codex home, selection, updater locks, journals and backups use a
Codex-home-specific state directory instead, so profiles cannot inherit or replace
one another's saved selection or interrupted transaction.

## First setup

Use an existing supported Node/npm and the selected host CLI. Keep the checkout
at a stable path because native package bindings include that path.

```bash
git clone https://github.com/quickstark/skills.git
cd skills
npm ci
codex plugin marketplace add ./codex
npm run skills:plan -- --json --agent codex --agent pi
npm run skills:update -- --agent codex --agent pi
```

For Codex, register the existing local marketplace directory before planning;
the production input rejects an absent marketplace. Run the bootstrap from the
checkout root, or use its absolute `/path/to/skills/codex` directory. Omit it on a
Pi-only machine. An existing QuickStark registration with a different identity or
path requires a separately reviewed correction; do not remove or repoint it blindly.

The plan is read-only. Inspect its desired selection, ownership, retirement,
acceptance and conflict evidence. Update is the mutation command and revalidates
live state. A missing accepted package receipt, modified managed content,
unexpected exposure or unsupported native state blocks mutation.

## Target a separate Codex home

Use `--codex-home` when the Codex configuration profile is not the default
`~/.codex`. Resolution is explicit `--codex-home`, then inherited `CODEX_HOME`,
then `<resolved user home>/.codex`. `--home` still selects the operating-system
user home; `--profile` selects a QuickStark package profile; neither substitutes
for `--codex-home`. A custom Codex home currently supports a Codex-only transaction,
so do not combine it with `--agent pi`.

Register the QuickStark marketplace in the selected profile before planning:

```bash
CODEX_HOME="$HOME/.codex-demo" codex plugin marketplace add ./codex
```

Then use the same target for every operation:

```bash
git pull --ff-only origin main
CODEX_HOME="$HOME/.codex-demo" codex plugin marketplace add ./codex
npm run skills:plan -- --json --agent codex --codex-home "$HOME/.codex-demo"
npm run skills:update -- --agent codex --codex-home "$HOME/.codex-demo"
npm run skills:verify -- --agent codex --codex-home "$HOME/.codex-demo"
npm run skills:update -- --agent codex --codex-home "$HOME/.codex-demo" --resume /absolute/path/to/transaction.json
```

The selected profile's `config.toml`, plugin cache and discovery paths remain
under that Codex home. Native commands still receive the actual user home through
`HOME` and `USERPROFILE`, and receive the selected profile through `CODEX_HOME`.
Resume refuses a journal created for another normalized Codex home.

## Normal update and explicit additions

From the maintained checkout, refresh it without discarding local work, then use
the same selected hosts for plan and update:

```bash
git pull --ff-only origin main
npm run skills:plan -- --json --agent codex --agent pi
npm run skills:update -- --agent codex --agent pi
```

This preserves saved optional selections. To add frontend explicitly:

```bash
npm run skills:plan -- --json --agent codex --with qs-frontend
npm run skills:update -- --agent codex --with qs-frontend
```

Repeat `--with` for other selected packages. Omit `--profile core` during an ordinary
update unless you deliberately intend to replace the desired selection with core.
Restart the host or begin a new task after changing discovery.

Before mutation, `skills:update` queries the current `origin/main` without fetching
or changing refs and requires exact checkout HEAD equality. A stale clean main
checkout gets a fast-forward recovery command; a dirty, detached or non-main
checkout gets an isolated-worktree recovery. Preserve local changes and use the
printed recovery. A denied freshness request is an attempted request, not proof of
zero network activity.

## Verification and recovery

`npm run skills:verify -- --agent codex --agent pi` runs repository checks/tests
and then read-only selected-state verification. `node scripts/managed-skills.mjs
verify --json --agent codex --agent pi` performs only the selected-state check.
Verification checks accepted package bindings and requires selected legacy
identities to have completed migration; a package version string alone is insufficient.

`skills:sync -- --authorize` remains the explicit review-then-authorize interface.
Update/sync use an exclusive updater lock and a transaction journal. Preserve a
failure's journal and backups. For an interrupted transaction, use its exact path:

```bash
npm run skills:update -- --agent codex --resume /absolute/path/to/transaction.json
```

Ordinary resume continues the frozen forward plan using the journal's selection;
do not add profile or package flags. Failed transactions retain their journal,
backups and residuals. Restoring a prior release or journaled effects requires
separately verified, transaction-specific recovery authority; no automatic rollback
is promised.
It must match the home, repository and release revision. A stale updater lock is
never automatically stolen; investigate the recorded owner before explicit recovery.
Never repair a conflict by deleting a cache or rewriting a lock blindly. A failed
rollback must retain its residual paths and diagnostics rather than claim success.

The old `ps-skills` 3.8.0 payload remains a [transition artifact](./upstream/package-transition.md)
while existing native registrations need observation and verified withdrawal. Its
presence is not a new selection or an alias for a QS command. Unowned, edited,
filtered or ambiguous state remains a conflict; migration does not grant arbitrary
filesystem deletion or extra optional outcomes.

Contributor curation, exact pins, portable resource placement and separately
authorized third-party Pi manager actions are documented in the
[control-plane guide](./personal-skills.md). Project video runtime/model acquisition,
paid providers, publication, native settings changes outside the transaction and
optional execution hooks require their own task authority.
