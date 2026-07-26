# Contributing to QuickStark Skills

## Start from the source of truth

Read `CLAUDE.md`, `CONTEXT.md`, and the root `README.md` before changing a skill. `scripts/qs-skill-catalog.mjs` is the source of truth for every promoted skill, its upstream mapping, bucket, invocation policy, display metadata, report profile, and recommended follow-ons.

Canonical skill files live in `skills/engineering/` and `skills/productivity/`. `codex/plugins/qs-skills/skills/` is a generated snapshot, not a second source tree. Do not promote `skills/misc/`, `skills/personal/`, `skills/in-progress/`, or `skills/deprecated/`.

## Install and verify

Use the repository lockfile and configured npm package manager:

```bash
npm ci
npm run check:codex
npm test
```

The project test suite checks all promoted skills, plugin versions, generated snapshots, documentation contracts, report rendering, viewer security, producer ingestion, cross-machine publishing, immutable retries, and credential rotation.

## Change a promoted skill

1. Update `scripts/qs-skill-catalog.mjs` first when adding or renaming a skill, adjusting invocation mode, changing its report profile, or changing its valid next steps.
2. Edit its canonical `skills/<bucket>/<skill-name>/SKILL.md` and matching `agents/openai.yaml`.
3. Update the corresponding `docs/<bucket>/<skill-name>.md`, bucket `README.md`, root `README.md`, and `skills/engineering/qs-help/SKILL.md` when discovery or workflow changes.
4. Add the promoted skill to `.claude-plugin/plugin.json`; preserve the explicit-versus-model-invoked policy.
5. Add behavior-focused tests to `tests/qs-skills.test.mjs`.
6. Regenerate output contracts and the Codex snapshot:

```bash
npm run sync:codex
```

7. Verify the complete result:

```bash
npm run check:codex
npm test
```

When Claude Code is installed and its manifest changed, also run:

```bash
claude plugin validate . --strict
```

Do not claim that a Claude validation ran if the CLI is unavailable.

## Document behavior from evidence

Update the existing authoritative document before adding another page:

- Use `README.md` for installation, skill discovery, and the main workflow.
- Use `docs/architecture.md` for component ownership and trust boundaries.
- Use `docs/readout-operations.md` for authenticated reporting, producer configuration, and operational recovery.
- Use `docs/engineering/` and `docs/productivity/` for promoted-skill reference pages.
- Use `CHANGELOG.md` for observed QuickStark version changes and preserved upstream history.
- Use `/qs-code-document` to keep setup, architecture, deployment, module, API, and release documentation grounded in actual project sources.

A repository version does not establish a published release. Record Git tags, GitHub releases, pull requests, deployment URLs, issue closures, and remote commits only after checking their actual state.

## Preserve reporting security

A skill readout can include only its actual execution machine, explicitly verified deployments, and files owned by that skill run. Never sweep pre-existing worktree changes into a report. Never record `.env` files, credentials, private keys, Git configuration, access tokens, internal source trees, or unapproved project data.

Hosted publishing is opt-in. Keep browser viewing, producer authentication, immutable storage, producer project grants, and the hosted project allowlist separate. Treat unknown external skills as external; do not add them to the QuickStark catalog merely to ingest a report.

## Release a version

Use the existing changeset workflow when a version change is actually requested:

```bash
npm run changeset
npm run version
npm run sync:codex
npm run check:codex
npm test
```

Keep `package.json`, `package-lock.json`, `.claude-plugin/plugin.json`, and `codex/plugins/qs-skills/.codex-plugin/plugin.json` synchronized. Publishing a commit, Git tag, plugin release, or deployed service is a separate, explicitly approved operation.

Put active release changesets for the `qs-skills` package directly in `.changeset/`, and keep the Changesets GitHub configuration pointed at `quickstark/skills`. Matt Pocock's original `mattpocock-skills` changesets are preserved in `docs/upstream/changesets/` as MIT-licensed historical reference; do not place them in the active Changesets directory.

## Respect the upstream

Matt Pocock's original MIT-licensed repository is the read-only upstream reference. Preserve its attribution, license, and original links.

```bash
git fetch upstream
git log HEAD..upstream/main --oneline
```

Adapt upstream improvements to the namespaced canonical skill. Push personal changes only to the configured QuickStark `origin` after obtaining the required authorization.
