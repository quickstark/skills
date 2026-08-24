# Central skill control plane

This repository controls two distinct skill sets without copying machine-owned
payloads into Git.

- QuickStark-owned skills live under `skills/` and continue through the
  generated Codex, Claude, and Pi packages.
- Approved personal and third-party resources live in
  `config/personal-skills.manifest.json`. Portable Agent Skills install once in
  `~/.agents/skills`; typed Pi packages retain Pi's native package manager.

The checked-in manifest is desired state. A machine inventory is discovery
evidence only and never grants approval by itself.

## Unified deployment

The top-level control plane plans and applies both ownership layers without
mixing them:

```bash
git pull --ff-only origin main
npm run skills:plan -- --json --agent codex --agent claude-code --agent pi
npm run skills:sync -- --authorize --agent codex --agent claude-code --agent pi
npm run skills:verify -- --agent codex --agent claude-code --agent pi
```

`skills:plan` is always read-only. `skills:sync` refuses to run without the
literal `--authorize` flag. It validates the current version and identity of
the three Claude, three Codex, and three Pi package manifests, completes contributor-skill
preflight, inspects installed package versions, and runs exact argument-vector
package-manager commands without a shell. Current packages are skipped; Claude
uses its update command for an older installed package, while Pi's local package
paths update in place after the checkout changes. The script then
delegates portable-resource changes to the transactional reconciler and verifies
both layers. If a manager command or installed-version check fails, contributor
mutation does not begin.
Package managers remain responsible for their own installed state; the script
does not attempt a destructive uninstall rollback.

The selected checkout is the source of the maintained package version. Pull
the desired commit first, inspect the JSON plan, and only then authorize sync.
This avoids using a mutable remote "latest" lookup during reconciliation.

## Harness placement

| Resource | Canonical content or manager | Codex | Claude Code | Pi |
| --- | --- | --- | --- | --- |
| Portable Agent Skill | `~/.agents/skills/<name>` | Direct discovery | Opt-in link under `~/.claude/skills/<name>` | Direct discovery |
| QuickStark package | Generated harness packages | Codex plugin manager | Claude plugin manager | Pi local package manager |
| Third-party Pi package | Pinned `npm:` or `git:` package in Pi settings | Not copied | Not copied | Pi package manager |

Pi officially scans both `~/.agents/skills/` and `~/.pi/agent/skills/`. Its
user package settings live in `~/.pi/agent/settings.json`; user npm and Git
packages install below `~/.pi/agent/npm/` and `~/.pi/agent/git/`. See the
[Pi Skills](https://pi.dev/docs/latest/skills) and
[Pi Packages](https://pi.dev/docs/latest/packages) documentation.
Maintained Pi commands use `/skill:<command>`; contributor Agent Skills keep
their own discovered names.

## Desired state

Schema version 2 uses typed resources:

- `agent-skill` records an immutable GitHub revision, license evidence,
  upstream tree identity, independent content SHA-256, canonical placement,
  and compatible harness targets.
- `pi-package` records an exact npm version plus SHA-512 integrity or an exact
  Git commit, license evidence, contributed directory- or file-backed skill
  paths and hashes, and the Pi-only target.

Schema-version-1 manifests remain accepted through lossless in-memory
migration. The pinned Skills CLI archive is `1.5.23`; synchronization verifies
its checked-in npm SHA-512 integrity before extracting or executing it.

## Reference-machine inventory

Inventory is deterministic and read-only:

```bash
npm run personal-skills:inventory -- --json > personal-skill-inventory.json
```

It inspects these user-global surfaces without invoking a harness package-list
command:

- `~/.agents/skills` and `~/.agents/.skill-lock.json`
- user and system Codex skill roots plus the Codex plugin cache
- Claude Code user skills and plugin cache
- Pi user skills, configured `settings.json` skill paths, package settings, and
  installed npm or Git package skills

Pi inventory follows package `pi.skills` selectors when present and otherwise
uses Pi's conventional `skills/` fallback. It discovers recursive `SKILL.md`
directories and supported Markdown skill files, evaluates glob and exclusion
filters without loading package code, and reports configured paths outside the
selected home as unresolved instead of reading across that boundary.

Every discovered entry is classified as `managed`, `candidate`, `alias`,
`conflict`, `ignored`, `separately-managed`, or `unresolved`. Reports use
home-relative paths, omit unrelated settings and credentials, and include a
state token. Built-ins, system skills, plugin payloads, and QuickStark generated
packages are never adoption candidates.

## Explicit adoption

Adopt exactly one live candidate. Treat a saved report as an untrusted
selector: adoption re-inventories the machine and rejects a stale state token.

Portable Agent Skill example:

```bash
npm run personal-skills:adopt -- \
  --candidate agent-skills:example \
  --state-token <inventory-state-token> \
  --type agent-skill \
  --license MIT \
  --license-path LICENSE \
  --agent codex \
  --agent pi \
  --agent claude-code
```

The candidate must already have immutable GitHub provenance in the Agent
Skills lock. Adoption fetches that exact commit, verifies its license, Git tree,
and content digest, and changes only the manifest. It does not reinstall the
skill.

Pinned npm Pi package example:

```bash
npm run personal-skills:adopt -- \
  --candidate pi-package:@owner/package \
  --state-token <inventory-state-token> \
  --type pi-package \
  --license MIT \
  --license-path LICENSE \
  --integrity sha512-<approved-registry-integrity> \
  --agent pi
```

Adoption downloads the exact npm version into private staging, verifies the
approved archive integrity without lifecycle scripts, validates tar headers and
paths before extraction, rejects links and special entries, enforces compressed,
expanded, per-file, payload, and entry bounds, and records only the package's
verified skills. Git-backed Pi candidates use an immutable GitHub commit and a
clean staged worktree instead. Approval is manifest-driven: adding a verified
resource does not require a source-code allowlist or a fixed resource count.

## Destination reconciliation

Inspect first, authorize synchronization separately, and verify afterward:

```bash
git pull --ff-only origin main
npm run personal-skills:plan -- --json --agent codex --agent pi
npm run personal-skills:sync -- --agent codex --agent pi
npm run personal-skills:verify -- --json --agent codex --agent pi
```

Add `--agent claude-code` only on a machine where `~/.claude` already exists.
Synchronization installs missing portable content once in `~/.agents/skills`,
updates only approved lock metadata, and creates only missing Claude links.
It refuses modified content, occupied destinations, unrelated links, effective
name collisions, stale state, symlink traversal, special files, and oversized
trees. Preflight considers only selected harnesses. Mutation runs as one local
transaction: canonical paths and the original lock file are journaled before an
installer call, post-sync verification runs before completion, and a failed run
restores current-run paths, empty roots, links, and exact prior lock contents.
The error reports `rolled-back` only after complete compensation and
`partial-reconciliation` when any restoration fails.

For a missing Pi package, plan and sync return one exact manager action such as:

```text
pi install npm:@owner/package@1.2.3
```

That action requires separate authorization. The reconciler never invokes Pi
package installation because packages may execute lifecycle code or contain
extensions with full user access. After the operator runs the approved action,
verification checks the exact settings pin, installed package identity, and
every contributed skill digest. Package filters honor ordered glob exclusions
and exact `+path` or `-path` overrides; disabled approved skills remain a policy
conflict rather than producing an automatic manager action.

## Compatibility commands

```bash
npm run personal-skills:inventory
npm run personal-skills:adopt
npm run personal-skills:plan
npm run personal-skills:sync
npm run personal-skills:verify
npm run skills:plan
npm run skills:sync -- --authorize
npm run skills:verify
```

`inventory`, both plan commands, and both verify commands are read-only.
`adopt` changes only desired state. The sync commands are the only commands
that change selected machine projections. Reconciliation is additive: removal, pruning, replacement
of an equivalent real Claude directory, remote fleet execution, credentials,
sessions, arbitrary global npm packages, Homebrew, apt, and dotfiles remain
outside this control plane.
