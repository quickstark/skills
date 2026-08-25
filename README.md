# QuickStark Skills v3

A focused engineering workflow for Codex, Claude Code, and Pi. The default `qs-skills` package exposes twelve lifecycle-ordered commands. The optional `qs-specialists` package adds seven bounded specialist workflows, and the optional explicit-only `ps-skills` package adds thirteen Cursor-neutral Pstack workflows.

QuickStark is adapted from [Matt Pocock's MIT-licensed skills](https://github.com/mattpocock/skills), with an optional adaptation of [Lauren Tan's MIT-licensed pstack](https://github.com/cursor/plugins/tree/main/pstack). The upstream notices are preserved in [third-party notices](./THIRD_PARTY_NOTICES.md).

To inspect upstream changes without publishing to it, use `git fetch upstream`; personalized changes are pushed only to `origin`.

## Skill control plane

This repository is the source of truth for QuickStark-owned plugin skills and
for the pinned manifest of approved third-party skills. Installed global skill
directories and plugin caches are machine projections; do not copy them back
into Git.

Use `npm run skills:update` to inspect, converge, and verify the complete
maintained-package and approved-resource template on one machine. Optional
`skills:plan` and `skills:verify` commands remain read-only; the compatibility
`skills:sync -- --authorize` workflow remains available for a separately
reviewed plan. The lower-level `personal-skills:*` commands remain available
for inventory, explicit adoption, and contributor-resource-only reconciliation.
Start with the [end-user installation and update guide](./docs/install-and-update-skills.md).
Maintainers can use the deeper [central skill control plane](./docs/personal-skills.md).

## Install

```bash
git clone https://github.com/quickstark/skills.git
cd skills
```

Codex core:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

Optional Codex specialists:

```bash
codex plugin add qs-specialists@quickstark
```

Optional Codex Pstack workflows:

```bash
codex plugin add ps-skills@quickstark
```

Claude Code core and optional specialists:

```bash
claude plugin marketplace add .
claude plugin install qs-skills@quickstark
claude plugin install qs-specialists@quickstark
claude plugin install ps-skills@quickstark
```

Pi core and optional packages:

```bash
pi install ./pi/packages/qs-skills
pi install ./pi/packages/qs-specialists
pi install ./pi/packages/ps-skills
```

Restart the host or begin a new task after changing installed plugins. A Git pull updates the checkout; it does not automatically refresh a cached installed plugin.

The direct package commands above install QuickStark only. To install or update
both QuickStark and the approved contributor skills through one reviewed
operation, select only the harnesses installed on that machine:

```bash
npm run skills:plan -- --json --agent codex --agent claude-code --agent pi
npm run skills:update -- --agent codex --agent claude-code --agent pi
```

The unified command first verifies, without fetching or changing local refs,
that checkout HEAD exactly matches GitHub's current `origin/main`. It then uses
the checked-out repository version as "latest", validates all nine generated
package manifests, and verifies the installed package versions reported by each
selected manager. A stale clean `main` checkout receives an exact fast-forward
pull command; other stale checkouts receive an isolated-worktree command so
local changes are preserved. Pi receives the three maintained QuickStark
package projections through its native local-package manager; the 18 approved
contributor skills remain portable Agent Skills.

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

## Optional Pstack workflows

`ps-skills` contains thirteen explicit-only commands under the `ps-` namespace. It is additive, does not change QS membership, and never chains public commands automatically. Start with [Using PS skills](./docs/pstack/using-ps-skills.md) for a practical command chooser, or browse the [PS command index](./docs/pstack/index.md) for individual references.

## v3 behavior

- Domain modeling, module decomposition, ticket decomposition, and TDD are internal capabilities, not commands.
- `qs-review-code action=refactor target=<scope>` is the refactoring workflow. An unscoped whole-codebase request stays read-only until a target is selected.
- Every invocation has one root skill and zero automatic public-skill hops.
- `effort=quick|standard|deep` controls execution depth; `report=brief|full` independently controls presentation. Defaults are `standard` and `brief`.
- Every non-release result has at most one next-work prompt, tied to an exact verified ticket, specification, issue, or grouped work item. Complete work with no follow-up emits none; release is terminal and always emits none. Build, Review-with-mutation, and Debug finish their authorized implementation, repair, testing, and validation inside one root instead of chaining re-evaluation skills.

See the [shared skill-run contract](./docs/skill-run-contract.md) and [v2-to-v3 migration guide](./docs/quickstark-v3-migration.md).

## Results in chat

Every promoted run presents one concise result directly in the conversation. Brief output includes status, outcome, decision-grade evidence, material failures or outputs, and three ranked copy-ready next prompts; full output adds supporting evidence. An internal clear-writing pass applies to every QS and PS result, with no external output system or separate credentials.

## Development

Update the relevant source-of-truth catalog (`scripts/qs-skill-catalog.mjs` or `scripts/ps-skill-catalog.mjs`) before changing promoted membership or order, then run:

```bash
npm run sync:codex
npm run check:codex
npm test
```

When Claude Code is available:

```bash
claude plugin validate . --strict
claude plugin validate ./packages/qs-specialists --strict
claude plugin validate ./packages/ps-skills --strict
```

See [architecture](./docs/architecture.md), [contributing](./docs/contributing.md), and the [changelog](./CHANGELOG.md).
