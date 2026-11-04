# Install and update QuickStark skills

This guide describes the six-package target updater. Selection options require
the target registry; an older checkout using the legacy updater rejects
`--profile`, `--with` and `--resume`. Do not use documentation alone as
proof that a target package is accepted or installed.

The target native transaction supports Codex, Claude Code and Pi (the coding-agent
harness). Use `--agent codex`, `--agent claude` (or `claude-code`), or `--agent pi`.
The updater detects those executables on PATH when no host is selected. Explicit
flags override detection; host selection is independent of the agent running it.
Repeat the flag to update multiple hosts with default configuration homes.

## Selection and the repository template

Updates move from a verified repository checkout to one machine. They do not copy
installed caches back into Git, synchronize machines, or adopt upstream changes.
The six packages are core `qs-skills` (12 roots), `qs-specialists` (9),
`qs-advanced` (12), `qs-frontend` (4), `qs-video` (1) and `qs-execution` (1).

| Situation | Selection |
| --- | --- |
| Fresh machine, no selection flags | `qs-skills` only; no standalone resources |
| Saved machine, no selection flags | Saved packages and resources for each selected host |
| Previously managed machine without saved selection | Verified ownership/capability migration preview; ambiguous or expanded exposure blocks |
| `--with <package-id>` | Explicit addition to the current selection; repeat for multiple additions |
| `--profile core` | Explicit desired core selection; reduction is not deletion authority |

`--agent` selects a host independently of package selection. `skills:update`
detects installed harnesses; direct plan/verify commands default to Codex.
The implemented addition flag is `--with`, not `--with-package`. Unknown IDs and
duplicate additions fail. New optional packages do not join an ordinary update.
The selection file is `~/.config/quickstark/skills-selection.json`; it is saved
only after the transaction succeeds. Do not edit it to bypass a migration conflict.
For a non-default host home, selection, updater locks, journals and backups use a
home-specific state directory instead, so profiles cannot inherit or replace
one another's saved selection or interrupted transaction.

## First setup

Use the same hosted command for first installation and later updates, from any
directory on macOS or Linux. Have Git, Node, curl and the harness CLIs you use on PATH:

```bash
curl -fsSL https://raw.githubusercontent.com/quickstark/skills/main/install.sh | bash
```

The bootstrap uses Node built-ins and local modules; `npm ci` is for development.
It selects the highest stable `vMAJOR.MINOR.PATCH` Git tag from the official
repository, resolves it to one commit and checks generated packages and committed
acceptance evidence locally before replacing the managed checkout. Numeric version
ordering handles versions such as 4.10.0 correctly; prereleases are ignored.
There are no client-side GitHub Actions queries or CI polling delays. Explicit
publication through `release.yml` creates the repository's version tag and GitHub
release directly. Linux/macOS tests are available in a separate manual workflow;
hosted runner availability does not gate publishing or local updates.

Use `--version MAJOR.MINOR.PATCH` to select an existing published version.
Automatic downgrades and changed source under the same version are rejected.
The first release with this installer is 4.4.1; publish it before using that version.
Earlier v4.4.0 lacks the new entry points and must not be retagged in place.

The installer retains versioned source checkouts under
`~/.local/share/quickstark/releases`; `~/.local/share/quickstark/current` is a
convenience link for local commands. Native packages and transaction journals use
physical versioned paths. A newer version does not rename or overwrite the source
needed by another profile or an interrupted transaction. Edited prior checkouts
are retained at their original paths while a clean replacement gets a new path.
Legacy `~/.local/share/quickstark/skills` directories and development clones remain
untouched. Installer ownership records remain under
`~/.local/state/quickstark/installer`; a recorded interrupted legacy source swap is
restored before proceeding. Active or unknown installer locks remain protected.

The updater detects executable `codex`, `claude` and `pi` commands on PATH, updates
their selections, and verifies installed state. Fresh hosts get core only. Existing
saved selections and already registered optional capabilities are retained. No
supported executable is an error; an incompatible manager fails visibly.

An unused marketplace is registered automatically. An old local QuickStark binding
or edited installed package can be repaired only after the old source's Git origin
proves it is the official repository and every replacement passes release acceptance.
Original configuration, caches and Pi source payloads are copied and verified,
including exact permissions, into private `repair-*` recovery directories before
native withdrawal. Native managers remove only known QuickStark registrations.
Remaining caches are retained, old source checkouts stay untouched, and unrelated
packages/settings are checked for preservation. Disabled, filtered, foreign or
unknown registrations are preserved rather than silently overwritten.

Historical caches can include whole repositories and dependency links. Original-state
backups record and copy those links literally without following external targets;
they retain file modes and use separate bounded capacity for large historical caches.
Installed package and accepted source verification still reject descendant links.

Codex inventory calls are scoped to the managed marketplaces, avoiding a refresh
of unrelated remote catalogs. Other cached skills remain collision and preservation
guards: their bytes and potential public names are inspected without claiming ownership
or adopting them. Unrelated configuration and cache contents must remain unchanged.
Enabled QuickStark selectors retained by an older catalog are reconciled through
the native manager after backups, preserving their selected capabilities. Disabled
or unknown registrations retain their existing protection.

Repair does not certify modified bytes as trusted history. A pending repair records
the intended selection before withdrawal, so a retry can restore that selection
after interruption. Failed operations retain original bytes and their repair record;
successful updates retain backups and save selection only after verification.

From an updated clone, `npm run skills:update` invokes the same published-version
flow. Older clones may still contain the old npm command: use the hosted command
to bypass them. Extra flags can be passed with `| bash -s -- --agent codex`, for
example. `--json` selects structured updater results; installer progress uses stderr.

For the advanced local commands below, first use the managed checkout:

```bash
cd "$HOME/.local/share/quickstark/current"
```

For an optional read-only preview, use `npm run skills:plan -- --json --agent codex`
(or another explicit host). Direct plan/verify do not register marketplaces; on a
fresh host they require `codex plugin marketplace add ./codex` or
`claude plugin marketplace add .` first. Normal installation needs only update.

## Claude setup

Use the automatic updater, or select Claude explicitly. Claude packages use user
scope; existing project/local or disabled
QuickStark registrations require explicit reconciliation. The core marketplace
entry points to the generated `packages/qs-skills` package, so the plugin cache
contains the public roots and private closure without copying the whole repository.

```bash
npm run skills:update -- --agent claude
```

A foreign marketplace source remains a conflict. The hosted installer can preserve
and replace known local QuickStark bindings as described above. Direct engine
callers keep their strict migration checks. Existing root-based Claude core packages migrate after their manifest,
declared core skills and private resources match an immutable Git ancestor. The
updater checks at most 32 manifest revisions in local history; unverifiable or
edited resources remain a conflict. The old cache is retained, including unrelated
files, and only native registration metadata and its orphan marker are changed.
The compact replacement requires a new release version; same-version caches are
never overwritten to force a layout change.

Claude recovery validates the original raw settings and metadata snapshots after
native inspection and immediately before restoring each target. A concurrent edit
blocks recovery and is preserved. Complete file replacements are prepared and
synced before an atomic rename. Before the first replacement, a bounded recovery
receipt records the raw target snapshots and immutable payload/source evidence;
its digest is synced into the journal's recovery intent. Replacements reuse the
snapshots that passed receipt validation and revalidate them before writing; a
later capture cannot adopt a concurrent edit as its baseline. An authorized recovery
retry validates each target against its original or restored bytes, so interruption
between settings and plugin metadata restoration can resume in a fresh process.
Edited targets, source changes or altered receipts block retry without replacing
those files. Recovery receipts also bind the installed payloads of active unrelated
plugins. Changes to those payloads block retry before any registration is restored,
including edits that introduce a duplicate skill identity. If an active unrelated
payload cannot be inspected, recovery preparation stops before restoration; preserve
that plugin and reconcile it explicitly. Unchanged unrelated plugins stay registered.
Retained caches restore only their orphan marker; interrupted removal of a newly
created cache resumes only over unchanged, previously recorded paths.
Failed recovery retains its journal, backups, receipt and residuals. Recovery does
not silently switch back to forward update.

## Target a separate Codex home

Use `--codex-home` when the Codex configuration profile is not the default
`~/.codex`. Resolution is explicit `--codex-home`, then inherited `CODEX_HOME`,
then `<resolved user home>/.codex`. `--home` still selects the operating-system
user home; `--profile` selects a QuickStark package profile; neither substitutes
for `--codex-home`. A custom Codex home currently supports a Codex-only transaction,
so do not combine it with `--agent pi`.

Update the selected profile directly; pass the same home to standalone verification
or recovery:

```bash
npm run skills:update -- --agent codex --codex-home "$HOME/.codex-demo"
node scripts/managed-skills.mjs verify --json --agent codex --codex-home "$HOME/.codex-demo"
```

The selected profile's `config.toml`, plugin cache and discovery paths remain
under that Codex home. Native commands still receive the actual user home through
`HOME` and `USERPROFILE`, and receive the selected profile through `CODEX_HOME`.
Resume refuses a journal created for another normalized Codex home.

## Claude and Pi configuration profiles

| Host | Explicit path | Environment fallback | Default |
| --- | --- | --- | --- |
| Codex | `--codex-home` | `CODEX_HOME` | `<user home>/.codex` |
| Claude Code | `--claude-home` | `CLAUDE_CONFIG_DIR` | `<user home>/.claude` |
| Pi | `--pi-home` | `PI_CODING_AGENT_DIR` | `<user home>/.pi/agent` |

Explicit paths take precedence over environment variables. `--home` sets the user
home; it does not change package selection. A custom configuration home requires
a single-host transaction and has separate selection, lock, journal and backup
paths. Pass the same host home to plan, update, verify and resume. Native commands
receive the resolved paths, preventing inherited overrides from redirecting a
transaction to another profile. Paths are resolved by Node without assuming a
particular checkout directory or shell. The GitHub validation matrix runs source
checks and isolated native integration tests with pinned Codex, Claude Code and Pi
CLIs on Linux and macOS 15. This is separate from deployment to a user's installed
profiles. Windows manager behavior is unverified. Automatic detection
groups default homes together and updates custom homes separately. Explicit home
flags without `--agent` select only those hosts. A journal resumes its original
host group without rediscovering PATH; supply the original custom home again.

```bash
npm run skills:update -- --agent claude --claude-home "$HOME/.claude-demo"
npm run skills:update -- --agent pi --pi-home "$HOME/.pi-demo"
```

## Normal update and explicit additions

Use the hosted command again; it selects a published version and maintains the managed checkout:

```bash
curl -fsSL https://raw.githubusercontent.com/quickstark/skills/main/install.sh | bash
```

This preserves saved optional selections. To add frontend explicitly:

```bash
npm run skills:update -- --agent codex --with qs-frontend
```

Repeat `--with` for other selected packages. Omit `--profile core` during an ordinary
update unless you deliberately intend to replace the desired selection with core.
Restart the host or begin a new task after changing discovery.

Direct development callers of the lower-level transaction query `origin/main` without fetching
or changing refs and requires exact checkout HEAD equality. A stale clean main
checkout gets a fast-forward recovery command; a dirty, detached or non-main
checkout gets an isolated-worktree diagnostic. The hosted installer instead verifies its pinned published tag and clean checkout,
so later main commits do not invalidate a release. It preserves authoring checkouts. A denied freshness request is an attempted request, not proof of
zero network activity.

## Verification and recovery

From the managed checkout, `node scripts/managed-skills.mjs verify --json --agent
codex --agent pi` performs the read-only selected-state check. Ordinary updates
already verify their result; this command is optional.

For development, `npm run skills:verify -- --agent codex --agent pi` also runs the
repository checks and full test suite. Run it from a development checkout with an
attached branch and local `main`, rather than a detached published checkout.
Verification checks accepted package bindings and requires selected legacy
identities to have completed migration; a package version string alone is insufficient.

Codex and Claude package verification compares source and installed copies using
Git executable-bit semantics. Different directory permissions created by a native
manager do not require `chmod` or a new package version. File contents, paths and
executable bits must still match. Source transaction snapshots retain exact
permissions and reject source changes after planning. Recorded backup snapshots
also retain exact permissions; installed-cache identity uses the portable comparison.

`skills:sync -- --authorize` remains the explicit review-then-authorize interface.
Update/sync use an exclusive updater lock and a transaction journal. Preserve a
failure's journal and backups. For an interrupted transaction, use its exact path:

```bash
npm run skills:update -- --resume /absolute/path/to/transaction.json
```

Older sources remain at their original physical paths, including after another
profile installs a newer version. Ordinary resume continues the frozen forward
plan using the journal's selection;
do not add profile or package flags. Failed transactions retain their journal,
backups and residuals. Restoring a prior release or journaled effects requires
separately verified, transaction-specific recovery authority; no automatic rollback
is promised.
A versioned resume reuses the managed checkout's original tag and commit, even
when a newer version exists. It must match the home, repository and release revision.
A legacy unversioned journal requires its original verified checkout and cannot be
silently resumed as a new published version. A stale updater lock is
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
