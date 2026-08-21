# Contributing to QuickStark Skills

## Start from the source of truth

Read `CLAUDE.md`, `CONTEXT.md`, and the root `README.md` before changing a skill. `scripts/qs-skill-catalog.mjs` owns QS membership, `scripts/ps-skill-catalog.mjs` owns PS membership and dispositions, and `scripts/skill-collection-registry.mjs` owns shared package identity and literals.

Canonical QS files live in `skills/engineering/` and `skills/productivity/`; canonical PS files live in `skills/pstack/commands/`. Internal capabilities live in `skills/internal/` and `skills/pstack/internal/`. All generated package trees are projections, not independent sources.

## Install and verify

Use the repository lockfile and configured npm package manager:

```bash
npm ci
npm run check:codex
npm test
```

The project test suite checks all promoted skills, plugin versions, generated snapshots, documentation contracts, direct-chat presentation, internal clear-writing, continuation routing, package isolation, and command-specific safety behavior.

## Change a promoted skill

1. Update the owning collection catalog first when adding or renaming a skill, adjusting invocation mode, or changing its valid next steps.
2. Edit its canonical QS or PS `SKILL.md` and matching `agents/openai.yaml`.
3. Update the bucket and root indexes and `qs-help` when discovery or workflow changes; `scripts/sync-v3-docs.mjs` owns concise command pages.
4. Assign the command to one catalog package projection; generated manifests must not be hand-edited.
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

When Claude Code is installed and manifests changed, run all three:

```bash
claude plugin validate . --strict
claude plugin validate ./packages/qs-specialists --strict
claude plugin validate ./packages/ps-skills --strict
```

Do not claim that a Claude validation ran if the CLI is unavailable.

## Document behavior from evidence

Update the existing authoritative document before adding another page:

- Use `README.md` for installation, skill discovery, and the main workflow.
- Use `docs/architecture.md` for component ownership and trust boundaries.
- Use `docs/skill-run-contract.md` for completion states, direct-chat presentation, clear writing, and continuation behavior.
- Use `docs/engineering/` and `docs/productivity/` for promoted-skill reference pages.
- Use `docs/pstack/` for generated PS command reference pages and its package index.
- Use `CHANGELOG.md` for observed QuickStark version changes and preserved upstream history.
- Use `/qs-code-document` to keep setup, architecture, deployment, module, API, and release documentation grounded in actual project sources.

A repository version does not establish a published release. Record Git tags, GitHub releases, pull requests, deployment URLs, issue closures, and remote commits only after checking their actual state.

## Preserve result safety

A chat result contains only evidence relevant to its root run. Never sweep pre-existing worktree changes into the result or expose `.env` files, credentials, private keys, Git configuration, access tokens, full sensitive logs, private paths, internal source trees, or unapproved project data.

Apply the internal clear-writing pass only after facts, inferences, and uncertainties are separated. Clearer prose never substitutes for evidence or removes material qualifications. Treat unknown external skills as external; do not add them to the QuickStark catalog merely to recommend them.

## Release a version

Use the existing changeset workflow when a version change is actually requested:

```bash
npm run changeset
npm run version
npm run sync:codex
npm run check:codex
npm test
```

Keep `package.json`, `package-lock.json`, all three Claude manifests, and all three Codex manifests synchronized. Publishing a commit, Git tag, plugin release, or deployed service is a separate, explicitly approved operation.

Put active release changesets for the `qs-skills` package directly in `.changeset/`, and keep the Changesets GitHub configuration pointed at `quickstark/skills`. Matt Pocock's original `mattpocock-skills` changesets are preserved in `docs/upstream/changesets/` as MIT-licensed historical reference; do not place them in the active Changesets directory.

## Respect the upstream

Matt Pocock's original repository and Lauren Tan's pstack are MIT-licensed upstream sources. Preserve both notices and original links; PS tests use the pinned inventory and never fetch upstream at test time.

```bash
git fetch upstream
git log HEAD..upstream/main --oneline
```

Adapt upstream improvements to the namespaced canonical skill. Push personal changes only to the configured QuickStark `origin` after obtaining the required authorization.
