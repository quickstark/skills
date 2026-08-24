# Install and update QuickStark skills

This guide is for people who use QuickStark on one or more Macs or Linux
machines with Codex, Claude Code, or the Pi coding-agent harness. In this guide,
Pi means the coding-agent harness, not Raspberry Pi OS.

## What the repository manages

The repository keeps two kinds of skills synchronized without treating an
installed machine as the source of truth.

| Skill type | Current contents | Installation model |
| --- | --- | --- |
| QuickStark maintained packages | 12 core commands, 7 specialists, and 13 PS commands | Installed through each harness's package manager |
| Approved contributor skills | 18 pinned personal or third-party Agent Skills | Installed once in `~/.agents/skills` |

Codex and Pi discover the approved contributor skills directly from
`~/.agents/skills`. Claude Code receives links under `~/.claude/skills` only
when `claude-code` is selected. Vendor-provided system skills, built-in skills,
plugin caches, and proprietary harness skills remain owned by their original
manager and are not copied between machines.

QuickStark's Pi commands are separate native local packages under
`pi/packages/`. They do not replace or duplicate the 18 portable contributor
skills. Pi documents local packages and Agent Skill discovery in its
[package](https://pi.dev/docs/latest/packages) and
[skill](https://pi.dev/docs/latest/skills) references.

## Choose the right command

Use the unified `skills:*` commands for normal installation and updates.

| Command family | QuickStark packages | Approved contributor skills | Intended use |
| --- | --- | --- | --- |
| `skills:*` | Yes | Yes | Normal end-user workflow |
| Direct `codex plugin`, `claude plugin`, or `pi install` | Yes | No | QuickStark-only manual installation |
| `personal-skills:*` | No | Yes | Inventory, curation, or contributor-only repair |

`skills:plan` and `skills:verify` are read-only. `skills:sync` changes selected
machine projections and requires the literal `--authorize` flag.

## First-time setup

Install Git, Node.js with npm, and the CLI for each harness you plan to use.
Keep the repository in a stable path because Pi records the absolute path of
each local QuickStark package.

```bash
git clone https://github.com/quickstark/skills.git
cd skills
git switch main
git pull --ff-only origin main
```

Select only harnesses installed on that machine. Repeat `--agent` for each one:

```bash
npm run skills:plan -- --json --agent codex --agent pi
npm run skills:sync -- --authorize --agent codex --agent pi
npm run skills:verify -- --agent codex --agent pi
```

For a machine with all three harnesses, use:

```bash
npm run skills:plan -- --json --agent codex --agent claude-code --agent pi
npm run skills:sync -- --authorize --agent codex --agent claude-code --agent pi
npm run skills:verify -- --agent codex --agent claude-code --agent pi
```

Review the JSON plan before authorizing synchronization. Expected manager
actions name only the selected harnesses, the three QuickStark packages, and
the current checkout path. The contributor plan should report the approved
resources separately. Stop if it reports a conflict or an unexpected path.

Start a new harness task after package changes so the harness reloads its skill
inventory.

## Update a machine

Run the same sequence from the repository root on every Mac or Linux machine:

```bash
cd /path/to/skills
git switch main
git pull --ff-only origin main
npm run skills:plan -- --json --agent codex --agent pi
npm run skills:sync -- --authorize --agent codex --agent pi
npm run skills:verify -- --agent codex --agent pi
```

Use the same `--agent` selections for plan, sync, and verify. A Git pull updates
the Pi local-package contents in place. Codex and Claude Code still use their
package managers so their installed package caches can be refreshed safely.

Synchronization is additive. It installs missing approved content, updates
approved lock metadata, and creates requested Claude links. It does not prune
unrelated skills, copy plugin caches, uninstall packages, or replace conflicting
content.

## Understand the result

- `managerActions` covers the three maintained QuickStark packages for each
  selected harness.
- `personalPlan` covers the approved contributor skills.
- `conflicts` must be empty before synchronization begins.
- A successful verification confirms package identity and version, portable
  skill digests, lock metadata, Claude links when selected, and Pi package
  settings when selected.

Third-party Pi packages are treated differently from QuickStark's generated Pi
packages. A pinned third-party Pi package can produce an exact `pi install`
action, but the contributor reconciler does not execute it automatically. That
package remains separately authorized because third-party packages may include
executable extensions or lifecycle behavior.

## Troubleshooting

### npm reports a missing script

Run the commands from the current repository root, not from an installed skill
directory or plugin cache:

```bash
pwd
git remote -v
git status --short --branch
npm run
```

`npm run` should list `skills:plan`, `skills:sync`, `skills:verify`, and the
`personal-skills:*` commands. If it does not, that checkout predates the control
plane or did not receive the latest `origin/main`. Update a clean checkout with
`git pull --ff-only origin main`. Do not discard local changes merely to make a
pull succeed; use a separate clean checkout when necessary.

### A package is missing or stale

Run `skills:plan` with the same harness selection and inspect its exact manager
action. Then run the authorized sync and the read-only verification. Do not copy
a package cache from another machine.

### Verification reports a conflict

Do not overwrite the reported path manually. A conflict means installed
content, a link, a package filter, or lock metadata differs from approved state.
Preserve the report and reconcile that specific ownership issue before running
sync again.

### Pi reports an old checkout path

Pi local packages are tied to the repository path recorded in
`~/.pi/agent/settings.json`. Run the plan from the checkout you intend to keep.
It will report a stale QuickStark package path instead of silently registering a
second copy.

## For maintainers

End users should not adopt machine discoveries into the repository. Inventory,
candidate adoption, provenance rules, transactional rollback, and manifest
maintenance are documented in the
[central skill control plane](./personal-skills.md).
