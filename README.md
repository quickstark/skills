# QuickStark Skills

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

Start a fresh chat after updating skills. For a Codex-managed background server,
use `/daemon` → **Restart background server**, or run these commands on the server
host with its existing OS account and `CODEX_HOME`:

```bash
codex app-server daemon restart
```

Then retry `codex app-server daemon version` for up to 30 seconds with the same
account and `CODEX_HOME`. Require `status: running`, the expected profile socket
and a nonempty `appServerVersion`. A service being active is not Codex readiness;
an initial missing socket may clear during startup. The copy/paste helper above
waits automatically. If readiness times out, inspect the launcher before retrying.

For the terminal client, enter `/quit`, then run `codex`; use `codex resume` or
`codex resume --last` to continue a saved chat. For the desktop app, quit and reopen;
for an editor, reload its window; for an app-launched SSH connection, disconnect
and reconnect. These clients may reconnect to an existing server.

For an externally managed server, use its verified systemd unit, launchd job or
original manual launcher. The [restart command reference](./docs/install-and-update-skills.md#restart-codex-after-an-update)
includes Linux user/system services, another account's user service, macOS launchd
and manual processes. Finish active work before restarting a shared server.

## Overview

QuickStark is a collection of concise skills for planning, building, reviewing,
documenting and delivering work. All 39 public commands use the `qs-` namespace
and belong to one of six packages. Fresh setup selects the twelve-command core;
add optional packages for the workflows you use. Ordinary updates preserve that
selection. See the [changelog](./CHANGELOG.md) for release history.

The [Notion companion guide](https://app.notion.com/p/3a9238a125b28031bbbee1fcba64733f)
contains per-agent skill examples and machine-specific rollout history. GitHub remains the source for installation and package membership.

| Package | Public commands | Scope |
| --- | ---: | --- |
| `qs-skills` | 12 | Core lifecycle, including Help |
| `qs-specialists` | 9 | Specialists, including repository hygiene, reusable-skill and goal-prompt authoring |
| `qs-advanced` | 12 | PS-derived evidence workflows, including dedicated visual parity |
| `qs-frontend` | 4 | Frontend code, web images/prompts, mobile images/prompts, reference-to-code |
| `qs-video` | 1 | Video operations backed by 21 private modules and workflows |
| `qs-execution` | 1 | Substantial-work gates through `qs-unlazy` |

The [collection registry](./scripts/skill-collection-registry.mjs) and its catalogs
own package membership; 39 is the current total, not a policy cap. Every public
root has one package owner; private references are not extra dropdown commands.
Help can explain optional capabilities,
but checks actual availability before offering an executable literal and never
installs or starts another root automatically.

## Install and update

From any directory on macOS or Linux, use the same command for installation and updates:

```bash
curl -fsSL https://raw.githubusercontent.com/quickstark/skills/main/install.sh | bash
```

Have Git, Node (CI uses Node 22) and curl installed, along with the harness CLIs you use. The script
selects the highest stable published version tag, validates its generated packages
and acceptance evidence locally, then detects `codex`,
`claude` and `pi` on PATH and updates their skills.

It retains each version in a separate checkout under
`~/.local/share/quickstark/releases`. The `~/.local/share/quickstark/current` link
selects the current version for local commands. Native managers and journals use
the actual versioned path, so updating one profile cannot move another profile's
source. Edited and older checkouts stay intact; development clones are untouched.
Every ordinary update clean-reinstalls the selected QuickStark packages through
each client's native manager. Original QuickStark settings and caches are backed
up first. Unrelated plugins, settings and historical journals remain untouched.
Clients install independently; a Codex failure does not prevent Pi from updating.
After interruption, rerun the same command. The [installation guide](./docs/install-and-update-skills.md)
describes version selection, profiles and retained backups.

From an updated repository, `npm run skills:update` runs the same installer.
No manual pull, stash, dependency installation or separate verification is needed
for an ordinary update. `npm ci` is for repository development.

A fresh host receives `qs-skills`; an existing host retains its saved selection.
Optional packages remain opt-in. Use `--agent codex`, `--agent claude` (alias
`claude-code`) or `--agent pi` to override detection; repeat the flag for multiple
hosts. For example, add frontend to Codex explicitly:

```bash
curl -fsSL https://raw.githubusercontent.com/quickstark/skills/main/install.sh | bash -s -- --agent codex --with qs-frontend
```

Repeat `--with` for other packages. The requested selection is remembered before installation in
`~/.config/quickstark/skills-selection.json`, or profile-specific state for custom
homes. The installer verifies its managed checkout against the published tag commit
and checks ownership and release acceptance before replacement.

### Choose a version

Ordinary updates select the highest stable `vMAJOR.MINOR.PATCH` tag. Newer commits
on `main` and prerelease tags are ignored. To select a particular published version:

```bash
curl -fsSL https://raw.githubusercontent.com/quickstark/skills/main/install.sh | bash -s -- --version 4.4.6
```

The selected version must be published first. Automatic downgrades and changed
source under the same version are rejected. Publish package changes in a new version.

### Choose agents explicitly

Run just the line for the agents you want. Without `--agent`, the installer detects
all supported CLIs on PATH. These examples work on both macOS and Linux:

```bash
# Codex only
curl -fsSL https://raw.githubusercontent.com/quickstark/skills/main/install.sh | bash -s -- --agent codex
# Claude Code only
curl -fsSL https://raw.githubusercontent.com/quickstark/skills/main/install.sh | bash -s -- --agent claude
# Pi only
curl -fsSL https://raw.githubusercontent.com/quickstark/skills/main/install.sh | bash -s -- --agent pi
# Pi and Claude Code
curl -fsSL https://raw.githubusercontent.com/quickstark/skills/main/install.sh | bash -s -- --agent pi --agent claude
# Codex and Pi
curl -fsSL https://raw.githubusercontent.com/quickstark/skills/main/install.sh | bash -s -- --agent codex --agent pi
# All three
curl -fsSL https://raw.githubusercontent.com/quickstark/skills/main/install.sh | bash -s -- --agent codex --agent claude --agent pi
```

To add all five optional packages for all three agents explicitly:

```bash
curl -fsSL https://raw.githubusercontent.com/quickstark/skills/main/install.sh | bash -s -- --agent codex --agent claude --agent pi --with qs-specialists --with qs-advanced --with qs-frontend --with qs-video --with qs-execution
```

### Preview, verify and resume

After installation, use the managed checkout for optional local commands:

```bash
cd "$HOME/.local/share/quickstark/current"
npm run skills:plan -- --json --agent codex
node scripts/managed-skills.mjs verify --json --agent codex
```

These direct commands are read-only and default to Codex; they do not detect all
installed agents or register a fresh marketplace. Pass the same agent, package
and custom-home flags you intend to update when previewing. Verify with the same
agent and custom-home flags afterward. A hosted update already verifies its result.

Use the same host flags as the update. Restart the host or begin a new task to
refresh its skill catalog. A Git pull alone does not refresh cached plugins.

For an interrupted ordinary update, rerun the same hosted command with the same
agent and home flags. The desired selection is saved before removal. Keep old
`repair.json` files, journals and backups; ordinary clean installation does not
read them or require recovery commands.

To explicitly recover a historical transaction journal, use its exact path with `--resume`;
this flag takes the transaction journal, not `repair.json`. Use the original
custom-home flag again when applicable; do not add new package or profile selections:

```bash
curl -fsSL https://raw.githubusercontent.com/quickstark/skills/main/install.sh | bash -s -- --resume /absolute/path/to/transaction.json
```

### Separate configuration homes

To update a separate Codex profile:

```bash
curl -fsSL https://raw.githubusercontent.com/quickstark/skills/main/install.sh | bash -s -- --agent codex --codex-home "$HOME/.codex-demo"
```

`--codex-home` overrides inherited `CODEX_HOME`; otherwise the updater uses
`<user home>/.codex`. It isolates saved selection and transaction state by Codex
home. `--home` remains the operating-system user home, while `--profile` chooses
a QuickStark package selection. Ordinary installation attempts each client
independently, including default homes and multiple selected custom homes. The
retained historical migration engine requires a single-host transaction for a
custom home. Claude and Pi likewise accept
`--claude-home` / `CLAUDE_CONFIG_DIR` and `--pi-home` / `PI_CODING_AGENT_DIR`; explicit
flags override environment variables and each custom home has separate updater state.

| Agent | Custom-home flag | Environment fallback | Default |
| --- | --- | --- | --- |
| Codex | `--codex-home` | `CODEX_HOME` | `~/.codex` |
| Claude Code | `--claude-home` | `CLAUDE_CONFIG_DIR` | `~/.claude` |
| Pi | `--pi-home` | `PI_CODING_AGENT_DIR` | `~/.pi/agent` |

For example, update a separate Claude or Pi home with the corresponding line:

```bash
curl -fsSL https://raw.githubusercontent.com/quickstark/skills/main/install.sh | bash -s -- --agent claude --claude-home "$HOME/.claude-demo"
curl -fsSL https://raw.githubusercontent.com/quickstark/skills/main/install.sh | bash -s -- --agent pi --pi-home "$HOME/.pi-demo"
```

The [control-plane guide](./docs/personal-skills.md) explains pinned resources,
ownership checks, migration journals and recovery. Do not copy installed caches
back into Git or synchronize machines with one another.

### Troubleshooting updates

| Symptom | Check and next action |
| --- | --- |
| npm reports an old version, or Git pull refuses local edits | Run the hosted command from any directory. It uses a private clean checkout and preserves your existing clones and edits. |
| `Unsupported managed skill target: claude` | Use the hosted command to bypass the old updater. The current updater accepts both `claude` and `claude-code`. |
| Pi reports a stale QuickStark path | The hosted installer reconciles verified local QuickStark sources with the managed checkout and retains originals. Foreign or filtered sources remain protected. |
| Shared-consumer conflict | This applies to the retained historical migration engine. Ordinary 4.4.6 installation attempts clients independently; explicitly chosen legacy migrations retain their all-consumer and ownership checks. |
| Codex reports installed bytes differ from trusted history | Use the current hosted installer. Known caches are backed up and reinstalled, then source, file contents, paths and executable bits are verified. |
| `Repair metadata must be a bounded regular file.` with linked Pi settings | Use the current hosted installer. Support shipped in 4.4.5 and remains in 4.4.6; the settings link is preserved and its bounded regular target is backed up. |
| `Migration payload changed during inspection` on an older release | Ordinary 4.4.6 installation bypasses historical journals and unrelated-cache inspection. Retain originals and rerun with the same homes. The exact earlier concurrent change was not established; report exact output if current source or installed-byte verification fails. |

## Use a skill

These are chat prompts, not terminal commands. Open your project in the chosen
agent, start with Help, and replace each example subject with your own task.
Invoke optional commands only after their package is installed and the host
exposes them:

| Agent | Invocation format | Start here |
| --- | --- | --- |
| Codex | `$package-name:command-name` | `$qs-skills:qs-help Help me choose the next workflow for this project.` |
| Claude Code | `/command-name` | `/qs-help Help me choose the next workflow for this project.` |
| Pi | `/skill:command-name` | `/skill:qs-help Help me choose the next workflow for this project.` |

The [shared contract](./docs/skill-run-contract.md) defines `effort=quick|standard|deep`
and `report=brief|full`; their defaults are `standard` and `brief`. For example:

```text
$qs-skills:qs-code-debug effort=deep report=full Reproduce the reported update failure, identify its cause, and repair it with regression coverage.
```

## Delegation and ticket graphs in 4.4

QuickStark can delegate independent work when the host provides subagents.
Helpers start with fresh context, receive source/specification pointers and return
bounded evidence. The root checks that evidence and owns synthesis, integration
and completion. Packages ship no host-specific agent definitions. Pi uses the
serial fallback; other hosts also fall back to serial work when subagents are
unavailable. `effort=quick` uses no fan-out.

`qs-review-code` separates Standards and Spec review; Security is added for
`effort=deep` or security-sensitive work. Review defaults to read-only.
`qs-plan-spec` can explore independent evidence and writes tickets with explicit
`Blocked by` edges. Specialists and advanced roots delegate only the bounded
units described in their own instructions.

`qs-code-build` defaults to `mode=single`. Use `mode=graph` for an existing
specification and tickets with explicit, acyclic `Blocked by` edges. The frontier
is the open tickets whose blockers are complete. Replace the example path below
with your actual specification:

```text
$qs-skills:qs-code-build mode=graph Implement docs/specs/feature.md using its ticket graph. Preserve unrelated work and validate each ticket.
```

```text
/qs-code-build mode=graph Implement docs/specs/feature.md using its ticket graph. Preserve unrelated work and validate each ticket.
```

```text
/skill:qs-code-build mode=graph Implement docs/specs/feature.md using its ticket graph. Preserve unrelated work and validate each ticket.
```

Without explicit branch and worktree authority, tickets run one at a time in the
current working tree. To authorize isolated parallel implementation where supported,
add: “You may create a local integration branch and per-ticket worktrees, and
commit locally. Do not push or open a pull request.” The root serializes merges,
recomputes the frontier and performs final review and validation. Missing
specifications, missing edges or cycles require input before graph execution.

Delegation does not grant extra edit, Git, release or installation authority.
Use `qs-unlazy` from the optional `qs-execution` package when substantial work needs
per-leaf acceptance gates and ledgers. See the
[delegation guide](./docs/multi-agent.md) and
[shared run contract](./docs/skill-run-contract.md#delegation).

## Core commands

| Order | Command | Purpose |
| ---: | --- | --- |
| 10 | [`qs-help`](./skills/engineering/qs-help/SKILL.md) | Choose one workflow. |
| 20 | [`qs-setup`](./skills/engineering/qs-setup/SKILL.md) | Prepare or verify a project. |
| 30 | [`qs-plan-clarify`](./skills/engineering/qs-plan-clarify/SKILL.md) | Resolve scope and material decisions. |
| 40 | [`qs-plan-roadmap`](./skills/engineering/qs-plan-roadmap/SKILL.md) | Sequence confirmed outcomes. |
| 50 | [`qs-plan-spec`](./skills/engineering/qs-plan-spec/SKILL.md) | Write actionable specifications or dependency-aware tickets. |
| 60 | [`qs-code-build`](./skills/engineering/qs-code-build/SKILL.md) | Implement one scoped change. |
| 70 | [`qs-code-debug`](./skills/engineering/qs-code-debug/SKILL.md) | Diagnose and repair a defect. |
| 80 | [`qs-review-code`](./skills/engineering/qs-review-code/SKILL.md) | Review, improve, or refactor selected code. |
| 90 | [`qs-git-merge`](./skills/engineering/qs-git-merge/SKILL.md) | Integrate selected Git changes safely. |
| 100 | [`qs-deploy-release`](./skills/engineering/qs-deploy-release/SKILL.md) | Validate and execute an approved release. |
| 110 | [`qs-flow-triage`](./skills/engineering/qs-flow-triage/SKILL.md) | Route incoming work. |
| 120 | [`qs-flow-handoff`](./skills/productivity/qs-flow-handoff/SKILL.md) | Preserve verified continuation state. |

## Optional specialists

| Command | Purpose |
| --- | --- |
| [`qs-plan-research`](./skills/engineering/qs-plan-research/SKILL.md) | Answer one evidence-backed question. |
| [`qs-design-prototype`](./skills/engineering/qs-design-prototype/SKILL.md) | Test one design hypothesis. |
| [`qs-code-document`](./skills/engineering/qs-code-document/SKILL.md) | Document verified behavior. |
| [`qs-test-author`](./skills/engineering/qs-test-author/SKILL.md) | Add focused tests for existing behavior. |
| [`qs-test-verify`](./skills/engineering/qs-test-verify/SKILL.md) | Run and report selected software verification. |
| [`qs-learn-teach`](./skills/productivity/qs-learn-teach/SKILL.md) | Teach one bounded subject. |
| [`qs-skill-write`](./skills/productivity/qs-skill-write/SKILL.md) | Create or improve one agent skill. |
| [`qs-deploy-prompt`](./skills/engineering/qs-deploy-prompt/SKILL.md) | Generate a scoped autonomous deployment prompt. |
| [`qs-repo-cleanup`](./skills/engineering/qs-repo-cleanup/SKILL.md) | Audit or clean verified repository clutter while preserving user work. |

## Advanced and creative outcomes

`qs-advanced` supplies `qs-how`, `qs-why`, `qs-blast-radius`,
`qs-runtime-forensics`, `qs-trace-forensics`, `qs-create-verification-skill`,
`qs-maintain-verification-skill`, `qs-skill-eval`, `qs-hillclimb`,
`qs-visual-parity`, `qs-pr-babysit` and `qs-worktree-cleanup`.
Visual parity retains its immutable reference, selected tolerance and measured
residual; it is not absorbed into general frontend implementation.

`qs-frontend` separates `qs-design-frontend`, `qs-design-image-web`,
`qs-design-image-mobile` and `qs-design-image-to-code`. Image roots also accept
prompt-only work without generation or product edits. Reference-to-code preserves
the selected visual authority. `qs-deploy-prompt` remains the separate
goal-workflow-prompt author; generating a prompt never executes it.

`qs-video` retains 21 private resources, including ten specialized workflows,
Figma input and Studio guidance. Its [runtime profile](./skills/video/qs-video/references/runtime-compatibility.md)
documents exact tested local paths and unavailable provider routes. `qs-unlazy`
has a separate [runtime profile](./skills/engineering/qs-unlazy/references/runtime-compatibility.md);
optional hooks require their own authorization.

The retained `ps-skills` 3.8.0 payload is a [migration compatibility artifact](./docs/upstream/package-transition.md).
It stays observable until verified withdrawal and is excluded from fresh
selection. Original PS names and contributor names remain provenance, not aliases.

The [adoption acceptance record](./docs/validation/upstream-adoption-acceptance.json)
links decisions to their evidence. Reporting compression retained the existing
baseline because the efficiency experiment did not qualify. Mobile image adoption
allows only the [explicitly reported image-font limitation](./docs/specs/quickstark-upstream-adoption-font-amendment.md);
it does not guarantee exact fonts or image dimensions.

## All 39 commands — examples for every agent

Expand a package below and copy a single prompt from the column for your agent. The examples describe possible tasks, not actions performed by this documentation update.

<details>
<summary>qs-skills — 12 commands (core)</summary>

| Codex example | Claude Code example | Pi example |
| --- | --- | --- |
| `$qs-skills:qs-help Choose the right workflow for fixing a failing skills update.` | `/qs-help Choose the right workflow for fixing a failing skills update.` | `/skill:qs-help Choose the right workflow for fixing a failing skills update.` |
| `$qs-skills:qs-setup Verify QuickStark configuration for this project.` | `/qs-setup Verify QuickStark configuration for this project.` | `/skill:qs-setup Verify QuickStark configuration for this project.` |
| `$qs-skills:qs-plan-clarify Clarify the requirements and constraints for CSV export.` | `/qs-plan-clarify Clarify the requirements and constraints for CSV export.` | `/skill:qs-plan-clarify Clarify the requirements and constraints for CSV export.` |
| `$qs-skills:qs-plan-roadmap Sequence the agreed CSV export work into practical milestones.` | `/qs-plan-roadmap Sequence the agreed CSV export work into practical milestones.` | `/skill:qs-plan-roadmap Sequence the agreed CSV export work into practical milestones.` |
| `$qs-skills:qs-plan-spec Write an actionable specification for the agreed CSV export feature.` | `/qs-plan-spec Write an actionable specification for the agreed CSV export feature.` | `/skill:qs-plan-spec Write an actionable specification for the agreed CSV export feature.` |
| `$qs-skills:qs-code-build Implement the agreed CSV export specification and verify the result.` | `/qs-code-build Implement the agreed CSV export specification and verify the result.` | `/skill:qs-code-build Implement the agreed CSV export specification and verify the result.` |
| `$qs-skills:qs-code-debug Reproduce and fix the reported skills:update failure.` | `/qs-code-debug Reproduce and fix the reported skills:update failure.` | `/skill:qs-code-debug Reproduce and fix the reported skills:update failure.` |
| `$qs-skills:qs-review-code Review the current diff for defects and missing regression coverage.` | `/qs-review-code Review the current diff for defects and missing regression coverage.` | `/skill:qs-review-code Review the current diff for defects and missing regression coverage.` |
| `$qs-skills:qs-git-merge Integrate the selected verified branch into origin/main.` | `/qs-git-merge Integrate the selected verified branch into origin/main.` | `/skill:qs-git-merge Integrate the selected verified branch into origin/main.` |
| `$qs-skills:qs-deploy-release Publish the selected verified release using this repository's documented workflow.` | `/qs-deploy-release Publish the selected verified release using this repository's documented workflow.` | `/skill:qs-deploy-release Publish the selected verified release using this repository's documented workflow.` |
| `$qs-skills:qs-flow-triage Triage the selected incoming issues and recommend one bounded next action.` | `/qs-flow-triage Triage the selected incoming issues and recommend one bounded next action.` | `/skill:qs-flow-triage Triage the selected incoming issues and recommend one bounded next action.` |
| `$qs-skills:qs-flow-handoff Capture verified state, blockers, and next actions for another session.` | `/qs-flow-handoff Capture verified state, blockers, and next actions for another session.` | `/skill:qs-flow-handoff Capture verified state, blockers, and next actions for another session.` |

</details>

<details>
<summary>qs-specialists — 9 commands (optional)</summary>

| Codex example | Claude Code example | Pi example |
| --- | --- | --- |
| `$qs-specialists:qs-plan-research Compare the selected queue options against our stated requirements using primary sources.` | `/qs-plan-research Compare the selected queue options against our stated requirements using primary sources.` | `/skill:qs-plan-research Compare the selected queue options against our stated requirements using primary sources.` |
| `$qs-specialists:qs-design-prototype Prototype the checkout form to test the proposed interaction.` | `/qs-design-prototype Prototype the checkout form to test the proposed interaction.` | `/skill:qs-design-prototype Prototype the checkout form to test the proposed interaction.` |
| `$qs-specialists:qs-code-document Document the verified update and recovery commands.` | `/qs-code-document Document the verified update and recovery commands.` | `/skill:qs-code-document Document the verified update and recovery commands.` |
| `$qs-specialists:qs-test-author Add focused regression tests for the established profile-isolation behavior.` | `/qs-test-author Add focused regression tests for the established profile-isolation behavior.` | `/skill:qs-test-author Add focused regression tests for the established profile-isolation behavior.` |
| `$qs-specialists:qs-test-verify Run the verification matrix for the selected CSV export change.` | `/qs-test-verify Run the verification matrix for the selected CSV export change.` | `/skill:qs-test-verify Run the verification matrix for the selected CSV export change.` |
| `$qs-specialists:qs-learn-teach Teach me how the updater's transaction journal works using this codebase.` | `/qs-learn-teach Teach me how the updater's transaction journal works using this codebase.` | `/skill:qs-learn-teach Teach me how the updater's transaction journal works using this codebase.` |
| `$qs-specialists:qs-skill-write Improve the selected skill's instructions and verify its invocation examples.` | `/qs-skill-write Improve the selected skill's instructions and verify its invocation examples.` | `/skill:qs-skill-write Improve the selected skill's instructions and verify its invocation examples.` |
| `$qs-specialists:qs-deploy-prompt Write an execution-ready delivery prompt for the agreed feature without executing it.` | `/qs-deploy-prompt Write an execution-ready delivery prompt for the agreed feature without executing it.` | `/skill:qs-deploy-prompt Write an execution-ready delivery prompt for the agreed feature without executing it.` |
| `$qs-specialists:qs-repo-cleanup Audit repository clutter and propose a scoped cleanup while preserving user work.` | `/qs-repo-cleanup Audit repository clutter and propose a scoped cleanup while preserving user work.` | `/skill:qs-repo-cleanup Audit repository clutter and propose a scoped cleanup while preserving user work.` |

</details>

<details>
<summary>qs-advanced — 12 commands (optional)</summary>

| Codex example | Claude Code example | Pi example |
| --- | --- | --- |
| `$qs-advanced:qs-how Explain how the managed skill updater plans and applies a transaction.` | `/qs-how Explain how the managed skill updater plans and applies a transaction.` | `/skill:qs-how Explain how the managed skill updater plans and applies a transaction.` |
| `$qs-advanced:qs-why Explain why the installer keeps a managed checkout, using code and history.` | `/qs-why Explain why the installer keeps a managed checkout, using code and history.` | `/skill:qs-why Explain why the installer keeps a managed checkout, using code and history.` |
| `$qs-advanced:qs-blast-radius Map the impact of changing managed payload identity across callers, tests, and recovery.` | `/qs-blast-radius Map the impact of changing managed payload identity across callers, tests, and recovery.` | `/skill:qs-blast-radius Map the impact of changing managed payload identity across callers, tests, and recovery.` |
| `$qs-advanced:qs-runtime-forensics Diagnose the selected slow API request from runtime measurements without repairing it.` | `/qs-runtime-forensics Diagnose the selected slow API request from runtime measurements without repairing it.` | `/skill:qs-runtime-forensics Diagnose the selected slow API request from runtime measurements without repairing it.` |
| `$qs-advanced:qs-trace-forensics Analyze the supplied trace and identify its measured bottleneck.` | `/qs-trace-forensics Analyze the supplied trace and identify its measured bottleneck.` | `/skill:qs-trace-forensics Analyze the supplied trace and identify its measured bottleneck.` |
| `$qs-advanced:qs-create-verification-skill Create a rerunnable verification workflow for the established CSV export behavior.` | `/qs-create-verification-skill Create a rerunnable verification workflow for the established CSV export behavior.` | `/skill:qs-create-verification-skill Create a rerunnable verification workflow for the established CSV export behavior.` |
| `$qs-advanced:qs-maintain-verification-skill Reconcile the existing verification workflow with current application behavior.` | `/qs-maintain-verification-skill Reconcile the existing verification workflow with current application behavior.` | `/skill:qs-maintain-verification-skill Reconcile the existing verification workflow with current application behavior.` |
| `$qs-advanced:qs-skill-eval Compare the supplied control and variant using the selected tasks, rubric, and budget.` | `/qs-skill-eval Compare the supplied control and variant using the selected tasks, rubric, and budget.` | `/skill:qs-skill-eval Compare the supplied control and variant using the selected tasks, rubric, and budget.` |
| `$qs-advanced:qs-hillclimb Improve the selected benchmark metric within the agreed experiment budget.` | `/qs-hillclimb Improve the selected benchmark metric within the agreed experiment budget.` | `/skill:qs-hillclimb Improve the selected benchmark metric within the agreed experiment budget.` |
| `$qs-advanced:qs-visual-parity Match the selected page to the supplied immutable reference and agreed tolerance.` | `/qs-visual-parity Match the selected page to the supplied immutable reference and agreed tolerance.` | `/skill:qs-visual-parity Match the selected page to the supplied immutable reference and agreed tolerance.` |
| `$qs-advanced:qs-pr-babysit Monitor the selected pull request and assess its merge readiness.` | `/qs-pr-babysit Monitor the selected pull request and assess its merge readiness.` | `/skill:qs-pr-babysit Monitor the selected pull request and assess its merge readiness.` |
| `$qs-advanced:qs-worktree-cleanup Audit reclaimable worktrees and present exact eligible targets before any removal.` | `/qs-worktree-cleanup Audit reclaimable worktrees and present exact eligible targets before any removal.` | `/skill:qs-worktree-cleanup Audit reclaimable worktrees and present exact eligible targets before any removal.` |

</details>

<details>
<summary>qs-frontend — 4 commands (optional)</summary>

| Codex example | Claude Code example | Pi example |
| --- | --- | --- |
| `$qs-frontend:qs-design-frontend Build the selected dashboard within the existing design and framework constraints.` | `/qs-design-frontend Build the selected dashboard within the existing design and framework constraints.` | `/skill:qs-design-frontend Build the selected dashboard within the existing design and framework constraints.` |
| `$qs-frontend:qs-design-image-web Create a web landing-page design image for the supplied brief.` | `/qs-design-image-web Create a web landing-page design image for the supplied brief.` | `/skill:qs-design-image-web Create a web landing-page design image for the supplied brief.` |
| `$qs-frontend:qs-design-image-mobile Create mobile screen concepts for the supplied iOS onboarding brief.` | `/qs-design-image-mobile Create mobile screen concepts for the supplied iOS onboarding brief.` | `/skill:qs-design-image-mobile Create mobile screen concepts for the supplied iOS onboarding brief.` |
| `$qs-frontend:qs-design-image-to-code Implement the attached authoritative design reference as responsive code.` | `/qs-design-image-to-code Implement the attached authoritative design reference as responsive code.` | `/skill:qs-design-image-to-code Implement the attached authoritative design reference as responsive code.` |

</details>

<details>
<summary>qs-video — 1 command (optional)</summary>

| Codex example | Claude Code example | Pi example |
| --- | --- | --- |
| `$qs-video:qs-video Create the selected product demo video using the supplied brief and assets.` | `/qs-video Create the selected product demo video using the supplied brief and assets.` | `/skill:qs-video Create the selected product demo video using the supplied brief and assets.` |

</details>

<details>
<summary>qs-execution — 1 command (optional)</summary>

| Codex example | Claude Code example | Pi example |
| --- | --- | --- |
| `$qs-execution:qs-unlazy Complete the agreed CSV export scope against explicit acceptance gates and verify the result.` | `/qs-unlazy Complete the agreed CSV export scope against explicit acceptance gates and verify the result.` | `/skill:qs-unlazy Complete the agreed CSV export scope against explicit acceptance gates and verify the result.` |

</details>

## Results and authority

Every invocation owns one bounded result in chat. Public roots do not start other
public roots automatically. Only an explicitly submitted authorized goal workflow
may coordinate successive roots under the [shared contract](./docs/skill-run-contract.md).
Effort controls evidence depth, not mutation or publication authority.

Tracked results retain status, specs, a compact Work summary and at most one
eligible copy-ready next-work prompt. Release is terminal. Failed required checks
and actionable P0/P1 findings prohibit completion. Private helpers do not emit
separate results or expand authority.

## Development and release

Edit canonical sources and collection catalogs; regenerate package projections,
command pages, output contracts and provenance instead of editing generated copies.
The [architecture guide](./docs/architecture.md) maps catalogs and canonical
sources through the shared registry to each package's self-contained projection.

Use your authoring checkout for development. Replace the example path, inspect
local work before changing branches, and install development dependencies:

```bash
cd /path/to/your/skills
git status --short --branch
git rev-parse --short HEAD
node -p "require('./package.json').version"
npm ci
```

```bash
npm run sync:codex
npm run check:codex
npm test
```

The [release workflow](./.github/workflows/release.yml) is explicitly dispatched
on `main` after preparing and synchronizing a new version. It creates that
version's tag and GitHub release directly. Hosted tests are a separate manual
workflow and do not block publication. Pushes do not publish automatically.
Ordinary installations download the published repository version without waiting
for CI. See the [versioned installation specification](./docs/specs/quickstark-versioned-installation.md).

Published-version installation was introduced in 4.4.1. The current published
release is [4.4.6](https://github.com/quickstark/skills/releases/tag/v4.4.6), at
`fab40148cffd0c1ef3e0de6b4d44bc91bd411ca3`. Existing tags remain unchanged.
Publication does not establish installed-device rollout; 4.4.6 device installation
remains unverified.

## Upstreams and provenance

QuickStark adapts [Matt Pocock's skills](https://github.com/mattpocock/skills),
[Lauren Tan's pstack](https://github.com/cursor/plugins/tree/main/pstack), and
the other attributed sources below. It preserves the source identities and notices recorded in
[provenance](./docs/upstream/provenance.md) and [third-party notices](./THIRD_PARTY_NOTICES.md).
The [upstream log](./docs/upstream/README.md) distinguishes historical baselines,
reviewed sources and accepted adoption. `upstream` is read-only reference;
authorized personalized publication goes only to `origin`.
