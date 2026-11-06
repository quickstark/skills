# Install and update QuickStark skills

## Restart Codex after an update

<!-- quickstark-codex-restart:start -->
### Copy/paste restart script

Run this on the server host as the account that runs Codex, after active work
finishes. Paste the whole block once into Bash or zsh at a normal shell prompt.
Node, Codex and curl must be on PATH.

```bash
(
  set -e
  qs_restart_file="$(mktemp "${TMPDIR:-/tmp}/quickstark-codex-restart.XXXXXX")"
  trap 'rm -f "$qs_restart_file"' EXIT
  curl -fsSL 'https://raw.githubusercontent.com/quickstark/skills/2a885c9155bc4885182874dc3a945963d784e5f4/scripts/restart-codex.mjs' --output "$qs_restart_file"
  node --input-type=module - < "$qs_restart_file"
)
```

It uses Codex's native restart on Linux/macOS, the existing dedicated systemd
service on Linux (including dirk-dev), or the detached GMK Linux launch. It finds
the current target, preserves its configuration and excludes proxies. It waits
for Codex readiness before reporting success; uncertain targets stop.

The download is pinned to the tested script commit; a failed download stops
before execution. The temporary file is removed afterward. For a custom profile,
set `CODEX_HOME` first. To inspect without restarting, add `--check` after the `-`
on the `node` line. For a system-level service, the helper uses cached sudo
permission only for the verified service restart. If permission is required, run
`sudo -v` separately in your terminal, then paste the block again. User services
need no sudo. Actual Mac execution remains unverified; external launchd jobs and
app-owned servers use their original restart controls below.
<!-- quickstark-codex-restart:end -->

After updating QuickStark, start a fresh Codex chat to check that the skills load. Restart the App Server if the client still sees stale skills. A server restart can interrupt active or queued work across connected chats, so wait for that work to finish.

### Restart the client or the Codex-managed daemon

- **Terminal client** — Enter `/quit`, then run `codex` from the shell. Use `codex resume` to choose a saved chat or `codex resume --last` to continue the latest chat. These commands may reconnect to an existing App Server.
- **Desktop or editor-launched server** — Quit and reopen the desktop app, or reload the editor window that launched Codex. If the desktop app launched the server over SSH, disconnect and reconnect the host. For an independently managed remote server, restart it on the remote host, then reconnect.
- **Codex-managed App Server** — In the CLI, open `/daemon` and choose **Restart background server** if the menu offers it. From a shell on the server host, use the same OS account and `CODEX_HOME` as the running daemon.

```bash
codex app-server daemon restart
```

Then retry `codex app-server daemon version` for up to 30 seconds with the same
account and `CODEX_HOME`. Require `status: running`, the expected profile socket
and a nonempty `appServerVersion`. A service being active is not Codex readiness;
an initial missing socket may clear during startup. The copy/paste helper above
waits automatically. If readiness times out, inspect the launcher before retrying.

Check for a running App Server version, then reconnect and test a fresh chat. If your build lacks the shell command, check `codex app-server daemon --help` for its available controls. [OpenAI’s Codex command guide](https://learn.chatgpt.com/docs/developer-commands#manage-the-background-server-with-daemon)

### Find the account and launcher

If the daemon command reports `app server is running but is not managed by codex app-server daemon`, use the launcher that owns it. If a signal returns `Operation not permitted`, check the process account. Both checks matter because a system service can run as an ordinary user.

Run on the server host. Set `codex_pid` to the App Server PID you identify, then inspect its parent using the same `ps` command with the PPID.

```bash
id -un
ps -axww -o user,pid,ppid,command | grep -E '[c]odex.*app-server'
ps -ww -p "$codex_pid" -o user,pid,ppid,command
```

Keep the existing account, `CODEX_HOME`, and socket or port. Running the Codex CLI with plain `sudo` can select root’s configuration and start a different server.

### Linux with systemd

Use the PID to look up the unit. Run the user lookup from the service owner’s login. Check that the unit actually launches Codex before restarting it, since the system lookup can return a broader login scope or user manager.

```bash
systemctl --user status "$codex_pid"
systemctl status "$codex_pid"
```

Set `codex_unit` to the verified App Server service name and use the matching restart command.

```bash
# User service, from the owning account
systemctl --user restart "$codex_unit" && systemctl --user status "$codex_unit"

# System service, from an admin account
sudo systemctl restart "$codex_unit" && sudo systemctl status "$codex_unit"
```

For another account’s user service, SSH into the host as that account. If you already have admin access and systemd supports targeting a local user bus, set `codex_owner` to that account and check its service before restarting it.

```bash
sudo systemctl --user --machine="${codex_owner}@.host" status "$codex_unit"
sudo systemctl --user --machine="${codex_owner}@.host" restart "$codex_unit"
sudo systemctl --user --machine="${codex_owner}@.host" status "$codex_unit"
```

The helper above resolves a dedicated service from the selected server’s current cgroup, verifies its main process (or the observed root sudo wrapper), and uses the service’s loaded launch configuration. It never saves a transient `run-*.service` name as a permanent command. System service restarts use `sudo -n` with cached permission; `--check` never invokes sudo or restarts a service. It verifies a new service invocation, the replacement server’s profile and socket ownership, and Codex readiness. Unknown service layouts stop.

For a manual restart, use the live unit on the affected host because transient `run-*.service` names can change. The dirk-dev operator verified its manual systemd restart and a responding Codex `0.168.0-alpha.7`; the first immediate socket query was too early. The new helper’s systemd route has isolated fixture coverage; live helper execution on dirk-dev remains unverified. [systemctl manual](https://manpages.debian.org/trixie/systemd/systemctl.1.en.html)

### macOS with a custom launchd job

If you installed a standalone launchd job, set `codex_label` to its verified label. Use its loaded domain. Run the GUI example from the owner’s logged-in Mac session. Use `user/UID` instead if that is where the job is loaded.

```bash
# GUI LaunchAgent
launchctl print "gui/$(id -u)/$codex_label" &&
  launchctl kickstart -k "gui/$(id -u)/$codex_label"

# System LaunchDaemon
sudo launchctl print "system/$codex_label" &&
  sudo launchctl kickstart -k "system/$codex_label"
```

Rerun the matching `launchctl print` to confirm the job is running. The desktop app’s bundled server is restarted by quitting and reopening the app.

### Manually launched App Server

For a foreground server, press Ctrl+C in its original terminal and rerun its launch command. For a detached server such as a `nohup` launch, use the owning account and confirm the PID immediately before sending `kill -TERM "$codex_pid"`. Wait for the process to exit and for its listener to be released, then rerun the original command with the same flags and environment. The old blanket `pkill … || true` can hide a permission error and attempt a second launch while the first server is still running.

The companion [Codex Commands](https://app.notion.com/p/3be238a125b280a29cc9d255a7ca2a7a) page has a shorter restart reference. For an existing legacy Unix-socket setup, the start half is below. Use it only if it matches that server’s original launch. Run it after the old process exits.

```bash
nohup codex -c features.code_mode_host=true app-server --listen unix:// \
  >>"$HOME/.codex-app-server.log" 2>&1 </dev/null &
```

Check the launcher status or startup log, then reconnect to the same host or socket and open a fresh chat to verify the updated skill appears. [OpenAI’s App Server guide](https://learn.chatgpt.com/docs/app-server)

## Installation overview

This guide describes the six-package target updater. Selection options require
the target registry; an older checkout using the legacy updater rejects
`--profile`, `--with` and `--resume`. Do not use documentation alone as
proof that a target package is accepted or installed.

Ordinary installation clean-reinstalls QuickStark separately in Codex, Claude Code
and Pi (the coding-agent harness). Use `--agent codex`, `--agent claude` (or `claude-code`), or `--agent pi`.
The updater detects those executables on PATH when no host is selected. Explicit
flags override detection; host selection is independent of the agent running it.
Repeat the flag to update multiple hosts; ordinary installation processes their
default or custom configuration homes independently.

## Selection and the repository template

Updates move from a verified repository checkout to one machine. They do not copy
installed caches back into Git, synchronize machines, or adopt upstream changes.
The six packages are core `qs-skills` (12 roots), `qs-specialists` (9),
`qs-advanced` (12), `qs-frontend` (4), `qs-video` (1) and `qs-execution` (1).

| Situation | Selection |
| --- | --- |
| Fresh machine, no selection flags | `qs-skills` only; no standalone resources |
| Saved machine, no selection flags | Saved packages and resources for each selected host |
| Previously managed machine without saved selection | Install core plus known QuickStark packages reported by the native manager |
| `--with <package-id>` | Explicit addition to the current selection; repeat for multiple additions |
| `--profile core` | Clean-reinstall core; remove other QuickStark package registrations |

`--agent` selects a host independently of package selection. `skills:update`
detects installed harnesses; direct plan/verify commands default to Codex.
The implemented addition flag is `--with`, not `--with-package`. Unknown IDs and
duplicate additions fail. New optional packages do not join an ordinary update.
The selection file is `~/.config/quickstark/skills-selection.json`. Requested
packages are saved before native removal, so a plain rerun keeps optional choices
after interruption. Installed bytes and registrations are verified before reporting success.
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
Published-version installation was introduced in 4.4.1. The current published
release is [4.4.6](https://github.com/quickstark/skills/releases/tag/v4.4.6), at
`fab40148cffd0c1ef3e0de6b4d44bc91bd411ca3`. Device installation remains unverified.
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

## Clean installation on every update

The ordinary path validates the published replacement, remembers the desired
packages, backs up QuickStark settings and caches, removes the known QuickStark
registrations, registers the selected release and installs those packages fresh.
It verifies the resulting registrations and package payloads. An edited or
same-version QuickStark cache is replaced rather than treated as a migration.
Original settings and caches remain in private `clean-<client>-*` directories
under the existing backup root. Old source checkouts are never edited or deleted.

Codex, Claude Code and Pi are attempted independently. If one fails, the other
selected clients still run and their individual results are reported. A plain
rerun performs the same clean installation using the remembered selection. It
does not require a transaction journal, repair receipt or `--resume` command.
If a clean installer is killed, the next run can reclaim its recorded lock only
when its owner on the same host is no longer running. Live, unknown and historical
locks remain protected. Selection writes are atomic under that installer lock.

Only the finite known QuickStark package IDs are removed. Other plugins and
settings are left to the native managers. Their caches are not traversed or
fingerprinted. Foreign marketplace bindings, unknown QuickStark entries, filtered
Pi entries and project-scoped Claude packages are preserved and reported before
removal. Pi settings may remain a symlink to a regular dotfile; Pi updates it
through that link, and relative package paths still use its configuration directory.
Settings must remain outside both the accepted release and retained source checkouts.

Existing migration journals, pending repair records, historical standalone skills
and backups are retained unchanged. They are not inputs to ordinary installation.
The direct plan/verify/migration engine and explicit `--resume` option remain
available for recovery of a selected historical transaction. Those advanced
commands retain their stricter historical ownership and snapshot checks.

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

## Claude setup and legacy migration

Use the automatic updater, or select Claude explicitly. Claude packages use user
scope; existing project/local QuickStark registrations require explicit reconciliation. The core marketplace
entry points to the generated `packages/qs-skills` package, so the plugin cache
contains the public roots and private closure without copying the whole repository.

```bash
npm run skills:update -- --agent claude
```

A foreign marketplace source remains a conflict. The hosted installer clean-replaces known local QuickStark bindings as described
above. The remaining migration details in this section apply to direct engine
callers and retained historical transactions. Existing root-based Claude core packages migrate after their manifest,
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
for `--codex-home`. Ordinary installation can combine a custom Codex home with
other selected clients. The retained historical migration engine requires a
Codex-only transaction for that custom home.

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
home; it does not change package selection. Each custom configuration home has
separate selection, lock, journal and backup paths. Only the retained historical
migration engine requires a single-host transaction for a custom home. Pass the same host home to plan, update, verify and resume. Native commands
receive the resolved paths, preventing inherited overrides from redirecting a
transaction to another profile. Paths are resolved by Node without assuming a
particular checkout directory or shell. The GitHub validation matrix runs source
checks and isolated native integration tests with pinned Codex, Claude Code and Pi
CLIs on Linux and macOS 15. This is separate from deployment to a user's installed
profiles. Windows manager behavior is unverified. Ordinary installation attempts
each client independently, whether its home is default or custom. Explicit home
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
Ordinary clean installation uses an exclusive updater lock and no transaction journal.
The direct legacy update/sync engine uses a transaction journal. Preserve a
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
silently resumed as a new published version. Historical transaction locks are
never automatically stolen. Ordinary clean installation can reclaim only a
recognized same-host lock whose owner is proven absent; live and unknown locks
remain protected.
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
