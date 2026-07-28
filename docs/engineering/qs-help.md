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

`/qs-help` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and up to three copy-ready top next prompts. Present each complete prompt prominently in its own fenced text code block and place its suggested model and suggested thinking underneath in a visually muted callout. Each prompt embeds its catalog-approved follow-on skill and builds on the actual outcome, findings, decisions, outputs, and checks rather than merely recommending a skill name. Automatically generated prompts use the Codex-native `$qs-...` skill spelling; legacy explicit `/qs-...` prompts remain valid. Only the Codex composer and its skill picker can resolve a native skill mention into a blue token; a report cannot manufacture that UI state. Model and thinking guidance are explicitly heuristic; they are not measured model performance and never change the active configuration. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and open one full-height, project-first Project Workbench with verified project navigation, searchable actual skill runs, and complete immutable readouts. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

To automatically publish actual skill reports from Linux, macOS, or Windows, `QS_READOUT_PRODUCER_TOKEN` is the only required setting. Configure that authorized token privately; the reporting API derives the producer identity, while the skill automatically identifies the Codex harness and the project from its current working directory. Use the Git origin when available; otherwise derive a safe, stable local-workspace identity without revealing the absolute filesystem path. The default reports endpoint is `https://reports.quickstark.com/api/v1/readouts`; ordinary runs require no project list, owner pattern, producer identifier, harness setting, GitHub verification, Git remote, or locally running viewer. Generate the immutable local report first and present a hosted report URL only after authenticated acceptance. Never expose the private token, mislabel another project, accept unsafe project paths, or claim that a failed submission succeeded.
A completed report displays a compact Skill run metrics section near the top, immediately after Top next prompts. It shows actual skill-attributed model, reasoning effort, provider-reported input and output tokens, total tokens, and active duration only when the running harness or provider genuinely captured them. Show `Not captured` for unavailable values, preserve thread-level evidence under its actual scope, and never invent measurements or attach skill-run metrics to a catalog preview.

When this skill leaves a genuine user action, its readout may include `commands` containing the exact terminal command, a clear title, and a `detail` explaining why or when the user should run it. When actual source deserves attention, its readout may include `keyCode` containing the exact code, language, and optional safe repository-relative file path. Both appear as separate, copyable code blocks. Execution logs and already executed commands are not user instructions; omit both sections when they are not applicable. Never include secrets, credentials, tokens, private keys, invented code, or speculative terminal instructions.

Depending on the actual completed work, tailor one to three top next prompts from:

**1. [`/qs-setup`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-setup/SKILL.md)**

Configure a project that has not used the collection before.

```text
Use $qs-setup to configure this project for the QuickStark engineering skills.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `medium`
>
> Heuristic: Project setup benefits from careful, bounded configuration checks.

**2. [`/qs-plan-clarify`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-clarify/SKILL.md)**

Clarify requirements and durable decisions for new work.

```text
Use $qs-plan-clarify to clarify this project and document the resulting decisions.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Clarification benefits from deeper reasoning about requirements and trade-offs.

**3. [`/qs-design-architecture`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-architecture/SKILL.md)**

Identify and prioritize an existing codebase's refactoring opportunities.

```text
Use $qs-design-architecture to find the highest-value architecture improvements in this codebase.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `xhigh`
>
> Heuristic: Architecture analysis benefits from deeper cross-module and risk assessment.

## Where it fits

`/qs-help` sits above the complete collection as its map and entry point. It covers planning, design, implementation, testing, review, deployment, Git, handoffs, learning, and skill authoring; its own response points to the most relevant next skill rather than claiming to have run it.
