# Central skill control plane

This repository is the source of truth for two distinct skill sets:

- QuickStark-owned skills live under `skills/` and are projected into the
  checked-in Claude and Codex plugin packages.
- Approved third-party skills remain upstream-owned. The checked-in personal
  skills manifest selects 18 of them from four repositories and pins their Git
  revisions, licenses, tree identifiers, and installed content hashes.

Installed directories and plugin caches are machine projections, not sources.
Do not copy `~/.agents/skills`, `~/.claude/skills`, a Codex plugin cache, or a
machine lockfile back into this repository.

The canonical installation directory is `~/.agents/skills`. The global Skills
CLI provenance file remains `~/.agents/.skill-lock.json`. Project-local
`skills-lock.json`, unrelated skills, Codex profiles, conversation history, and
plugin caches are not synchronization inputs.

## Commands

```bash
npm run personal-skills:plan
npm run personal-skills:sync
npm run personal-skills:verify
```

The plan command is read-only and reports content or metadata drift. The verify
command is also read-only: it validates installed contents and lock metadata
without resolving or executing the installer. Synchronization is the only
command authorized to fetch or install. When a skill is missing, it resolves
the pinned Skills CLI `1.5.23`, fetches only pinned source commits, verifies
licenses and Git tree hashes, and refuses to overwrite an existing skill whose
contents do not match the manifest. A converged default Codex sync performs no
writes and does not resolve the installer.

Request Claude Code links only on a machine that already has Claude installed:

```bash
npm run personal-skills:sync -- --agent codex --agent claude-code
```

For machine-readable parity checks, append `-- --json` to any command. Content
hashes use the same path ordering and file hashing rules as the pinned Skills
CLI. HyperFrames is Apache-2.0; the other three selected upstreams are MIT.

## Repository verification

After changing owned skills, generated packages, or the third-party manifest,
run the complete control-plane gate:

```bash
npm run skills:verify
```

This checks all generated plugin projections, runs the complete test suite, and
verifies the installed third-party skills without changing repository or
machine state.

## Machine reconciliation

On macOS or Linux, update a checkout to an approved repository revision before
changing installed skills. Inspect the plan first, authorize synchronization
separately, and finish with the read-only gate:

```bash
git pull --ff-only origin main
npm run personal-skills:plan -- --json
npm run personal-skills:sync
npm run skills:verify
```

Refresh the QuickStark Codex or Claude plugin packages through their respective
plugin managers after the repository update. A Git pull updates source and
checked-in projections; it does not rewrite an already cached plugin.
