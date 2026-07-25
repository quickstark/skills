# QuickStark Skills

A focused, personal collection of engineering and productivity skills for Codex and Claude Code. Every promoted skill starts with `qs-`, so entering `/qs-` shows the collection together, and continuing with `/qs-plan-`, `/qs-code-`, `/qs-test-`, or `/qs-deploy-` narrows it by intent.

The engineering disciplines are adapted from [Matt Pocock's skills](https://github.com/mattpocock/skills). The upstream repository, original MIT license, and original source links remain available for reference.

## Clone on another machine

```bash
git clone https://github.com/quickstark/skills.git
cd skills
```

## Install in Codex

From the root of this repository:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

Start a new Codex task after installing. Type `/qs-` to see the whole collection or `/qs-help` to find the right workflow.

The Codex plugin packages only the promoted skills. Draft, personal, miscellaneous, and deprecated upstream skills do not appear in the installed collection.

## Install in Claude Code

From the root of this repository:

```bash
claude plugin marketplace add .
claude plugin install qs-skills@quickstark
```

Run `/qs-setup` once in a project to configure its issue tracker, domain documentation, and triage conventions.

## Browse by purpose

| Type | Commands | Purpose |
| --- | --- | --- |
| Help and setup | `/qs-help`, `/qs-setup` | Choose a workflow and configure a project. |
| Planning | `/qs-plan-clarify`, `/qs-plan-explore`, `/qs-plan-interview`, `/qs-plan-spec`, `/qs-plan-tickets`, `/qs-plan-roadmap`, `/qs-plan-research` | Turn an idea into researched, actionable work. |
| Design | `/qs-design-domain`, `/qs-design-modules`, `/qs-design-architecture`, `/qs-design-prototype` | Explore domain models, interfaces, architecture, and prototypes. |
| Coding | `/qs-code-build`, `/qs-code-debug` | Build a change or diagnose a regression. |
| Testing | `/qs-test-tdd` | Build behavior using a test-first feedback loop. |
| Review | `/qs-review-code` | Review changes against code standards and requirements. |
| Deployment | `/qs-deploy-release` | Verify and execute an existing, documented deployment safely. |
| Git | `/qs-git-merge` | Resolve an in-progress merge or rebase. |
| Workflow | `/qs-flow-triage`, `/qs-flow-handoff` | Organize incoming issues and hand work to another session. |
| Learning and skill authoring | `/qs-learn-teach`, `/qs-skill-write` | Learn a subject or improve an agent skill. |

## The main engineering workflow

```text
/qs-setup
    ↓
/qs-plan-clarify
    ↓
/qs-plan-spec
    ↓
/qs-plan-tickets
    ↓
/qs-code-build  →  /qs-test-tdd
    ↓
/qs-review-code
    ↓
/qs-deploy-release
```

Use `/qs-plan-roadmap` before the main flow for a large, ambiguous project. Use `/qs-flow-triage` when the work starts as an incoming issue, `/qs-code-debug` when something is broken, and `/qs-help` whenever you are unsure where to start.

## Engineering

### User-invoked

These skills run only when explicitly requested.

- [qs-help](./skills/engineering/qs-help/SKILL.md) — Find the right skill and understand the end-to-end workflow.
- [qs-setup](./skills/engineering/qs-setup/SKILL.md) — Configure a project's issue tracker, labels, and domain documentation.
- [qs-plan-clarify](./skills/engineering/qs-plan-clarify/SKILL.md) — Clarify a project through questions and capture durable decisions.
- [qs-plan-spec](./skills/engineering/qs-plan-spec/SKILL.md) — Turn agreed requirements into an actionable specification.
- [qs-plan-tickets](./skills/engineering/qs-plan-tickets/SKILL.md) — Break a plan into small, dependency-aware implementation tickets.
- [qs-plan-roadmap](./skills/engineering/qs-plan-roadmap/SKILL.md) — Map a large, ambiguous project into manageable decisions.
- [qs-design-architecture](./skills/engineering/qs-design-architecture/SKILL.md) — Find and improve weak points in an existing architecture.
- [qs-code-build](./skills/engineering/qs-code-build/SKILL.md) — Implement a specification or tracked ticket.
- [qs-flow-triage](./skills/engineering/qs-flow-triage/SKILL.md) — Turn incoming issues into actionable work.
- [qs-deploy-release](./skills/engineering/qs-deploy-release/SKILL.md) — Verify and run a documented deployment after the required confirmation.

### Model-invoked

These skills can also be selected automatically when the task fits.

- [qs-plan-research](./skills/engineering/qs-plan-research/SKILL.md) — Research a question against reliable primary sources.
- [qs-design-prototype](./skills/engineering/qs-design-prototype/SKILL.md) — Build a focused prototype to answer a design question.
- [qs-design-domain](./skills/engineering/qs-design-domain/SKILL.md) — Develop a clear domain model and shared project vocabulary.
- [qs-design-modules](./skills/engineering/qs-design-modules/SKILL.md) — Design clean interfaces and deep, testable modules.
- [qs-code-debug](./skills/engineering/qs-code-debug/SKILL.md) — Reproduce, diagnose, and regression-test a bug.
- [qs-test-tdd](./skills/engineering/qs-test-tdd/SKILL.md) — Implement behavior using a red-green test-driven loop.
- [qs-review-code](./skills/engineering/qs-review-code/SKILL.md) — Review code against its specification and project standards.
- [qs-git-merge](./skills/engineering/qs-git-merge/SKILL.md) — Resolve Git merge and rebase conflicts without losing work.

## Productivity

### User-invoked

- [qs-plan-explore](./skills/productivity/qs-plan-explore/SKILL.md) — Explore and pressure-test an idea without requiring a codebase.
- [qs-flow-handoff](./skills/productivity/qs-flow-handoff/SKILL.md) — Prepare a concise handoff for another agent or session.
- [qs-learn-teach](./skills/productivity/qs-learn-teach/SKILL.md) — Learn a subject through a practical, guided study plan.
- [qs-skill-write](./skills/productivity/qs-skill-write/SKILL.md) — Create or improve a focused, reliable agent skill.

### Model-invoked

- [qs-plan-interview](./skills/productivity/qs-plan-interview/SKILL.md) — Resolve a plan or decision through one focused question at a time.

## Updating the Codex plugin

The canonical skill files live under `skills/engineering` and `skills/productivity`. The Codex plugin contains a generated, curated snapshot because Codex accepts one skill directory, not the two promoted buckets.

After adding or changing a promoted skill:

```bash
npm run sync:codex
npm test
```

The tests verify that the Codex package contains exactly the promoted skills. Every packaged file is checked against its canonical source; the only permitted transformation removes Claude-only invocation frontmatter, because Codex represents the same restriction in `agents/openai.yaml`.

## Keeping the upstream as a reference

The `origin` remote is the [QuickStark fork](https://github.com/quickstark/skills). Matt's original repository remains available through the `upstream` remote:

```bash
git fetch upstream
git log HEAD..upstream/main --oneline
git show upstream/main:skills/engineering/tdd/SKILL.md
```

Consult [`scripts/qs-skill-catalog.mjs`](./scripts/qs-skill-catalog.mjs) for the mapping from each original upstream name to its QuickStark command. Review useful upstream changes and adapt them to the namespaced skill rather than blindly overwriting the personalized collection.

## License and attribution

The 22 adapted skills originate from [Matt Pocock's skills](https://github.com/mattpocock/skills) and remain covered by the original [MIT license](./LICENSE). `/qs-deploy-release`, the QuickStark naming system, the Codex packaging, and the repository validation are personal additions.
