# QuickStark Skills v3

A focused engineering workflow for Codex and Claude Code. The default `qs-skills` package exposes twelve lifecycle-ordered commands. The optional `qs-specialists` package adds five bounded specialist workflows.

QuickStark is adapted from [Matt Pocock's MIT-licensed skills](https://github.com/mattpocock/skills). The upstream attribution and license are preserved.

To inspect upstream changes without publishing to it, use `git fetch upstream`; personalized changes are pushed only to `origin`.

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

Claude Code core and optional specialists:

```bash
claude plugin marketplace add .
claude plugin install qs-skills@quickstark
claude plugin install qs-specialists@quickstark
```

Restart the host or begin a new task after changing installed plugins. A Git pull updates the checkout; it does not automatically refresh a cached installed plugin.

## Core commands

| Order | Command | Purpose |
| ---: | --- | --- |
| 10 | [`qs-help`](./skills/engineering/qs-help/SKILL.md) | Choose one workflow. |
| 20 | [`qs-setup`](./skills/engineering/qs-setup/SKILL.md) | Prepare or verify a project. |
| 30 | [`qs-plan-clarify`](./skills/engineering/qs-plan-clarify/SKILL.md) | Resolve scope and material decisions. |
| 40 | [`qs-plan-roadmap`](./skills/engineering/qs-plan-roadmap/SKILL.md) | Sequence confirmed outcomes. |
| 50 | [`qs-plan-spec`](./skills/engineering/qs-plan-spec/SKILL.md) | Write an implementation specification or tickets. |
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
| [`qs-learn-teach`](./skills/productivity/qs-learn-teach/SKILL.md) | Teach one bounded subject. |
| [`qs-skill-write`](./skills/productivity/qs-skill-write/SKILL.md) | Create or improve one agent skill. |

## v3 behavior

- Domain modeling, module decomposition, ticket decomposition, and TDD are internal capabilities, not commands.
- `qs-review-code action=refactor target=<scope>` is the refactoring workflow. An unscoped whole-codebase request stays read-only until a target is selected.
- Every invocation has one root skill and zero automatic public-skill hops.
- `effort=quick|standard|deep` controls execution depth; `report=brief|full` independently controls presentation. Defaults are `standard` and `brief`.
- Complete work has no next prompt. Work requiring a distinct workflow or user decision has exactly one.

See the [shared skill-run contract](./docs/skill-run-contract.md) and [v2-to-v3 migration guide](./docs/quickstark-v3-migration.md).

## Reports

Actual promoted runs publish one authenticated immutable readout through `https://reports.quickstark.com/`. A missing or rejected producer credential fails clearly and never substitutes a local path or private URL. Operational details live in [readout operations](./docs/readout-operations.md).

## Development

Update the source-of-truth catalog at `scripts/qs-skill-catalog.mjs` before changing promoted membership or order, then run:

```bash
npm run sync:codex
npm test
```

When Claude Code is available:

```bash
claude plugin validate . --strict
claude plugin validate ./packages/qs-specialists --strict
```

See [architecture](./docs/architecture.md), [contributing](./docs/contributing.md), and the [changelog](./CHANGELOG.md).
