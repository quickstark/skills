Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-help/SKILL.md) · [Upstream inspiration](https://github.com/mattpocock/skills/tree/main/skills/engineering/ask-matt)

## What it does

`/qs-help` is the routing and order-of-operations guide for every QuickStark skill. Describe your situation and it identifies the correct starting skill, explains what that skill does, and recommends the shortest sensible path forward.

It does not implement code, run a review, invoke a deployment, or suggest a long ceremonial workflow when a small change needs only a few steps.

## When to reach for it

Invoke `/qs-help` whenever you are starting a feature, assessing a refactor, diagnosing a bug, sorting incoming work, crossing sessions, or deciding whether something is ready to release.

## Order of operations for new work

1. `/qs-setup` — configure the project when needed.
2. `/qs-plan-clarify` — settle requirements; use `/qs-plan-explore` when no codebase exists.
3. `/qs-plan-roadmap` — map a large or uncertain project when the work spans sessions.
4. `/qs-plan-research` — investigate remaining evidence or technical unknowns.
5. `/qs-design-domain` — settle important concepts and terminology.
6. `/qs-design-prototype` — test a design decision when a concrete example is necessary.
7. `/qs-plan-spec` — document the agreed behavior.
8. `/qs-plan-tickets` — split substantial work into actionable, dependency-aware slices.
9. `/qs-design-modules` — define a clean interface when a meaningful new boundary is involved.
10. `/qs-code-build` and `/qs-test-tdd` — implement and verify the agreed behavior.
11. `/qs-review-code` — review correctness, requirements, and standards.
12. `/qs-deploy-release` — run an approved, documented deployment only when requested.

## Order of operations for refactoring

1. `/qs-design-architecture` — find and prioritize genuine architectural friction.
2. `/qs-plan-clarify` — agree on scope, preserved behavior, and success.
3. `/qs-design-modules` and `/qs-design-domain` — design the intended interface and vocabulary.
4. `/qs-test-tdd` — protect existing behavior before the refactor.
5. `/qs-plan-spec` and `/qs-plan-tickets` — document or split larger refactors only when useful.
6. `/qs-code-build` — refactor in small, tested steps.
7. `/qs-review-code` — verify architecture, behavior, tests, and standards.
8. `/qs-deploy-release` — release only if the deployment was requested and approved.

Use `/qs-code-debug` first if the real problem is a reproducible bug rather than a confirmed architectural issue. Use `/qs-flow-triage` for incoming requests, `/qs-git-merge` for actual Git conflicts, and `/qs-flow-handoff` when moving work to a fresh session.

## Output and next steps

`/qs-help` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and the best next step. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and browse verified projects, searchable reports, and actual recent activity. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

Depending on what actually happened, the next step may be:

- [`/qs-setup`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-setup/SKILL.md) — Configure a project that has not used the collection before.
- [`/qs-plan-clarify`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-clarify/SKILL.md) — Clarify requirements and durable decisions for new work.
- [`/qs-design-architecture`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-architecture/SKILL.md) — Identify and prioritize an existing codebase's refactoring opportunities.

## Where it fits

`/qs-help` sits above the complete collection as its map and entry point. It covers planning, design, implementation, testing, review, deployment, Git, handoffs, learning, and skill authoring; its own response points to the most relevant next skill rather than claiming to have run it.
