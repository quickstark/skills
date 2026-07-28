Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

## What it does

`/qs-code-document` creates or updates accurate project documentation from the actual implementation, tests, configuration, and verified deployment evidence.

Use it for README files, setup instructions, API and module references, architectural decisions, operational runbooks, deployment guides, migration notes, and genuine release notes. It records the machine where the skill actually ran and identifies only the documentation files it actually modified.

The skill separates verified information from open questions. It will not describe an unpublished commit as a release, invent a pull request or issue, expose credentials, or document an unverified deployment URL.

## When to reach for it

Invoke `/qs-code-document` when a code change, design decision, release, deployment, or existing project behavior needs accurate reader-facing documentation. The agent can also select it automatically when documentation is the actual task.

Use `/qs-code-build` for implementation, `/qs-design-architecture` for an architectural assessment, and `/qs-deploy-release` for an explicitly approved deployment. Use `/qs-code-document` to record the verified results of those workflows.

## Output and next steps

`/qs-code-document` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and up to three copy-ready top next prompts. Present each complete prompt prominently in its own fenced text code block and place its suggested model and suggested thinking underneath in a visually muted callout. Each prompt embeds its catalog-approved follow-on skill and builds on the actual outcome, findings, decisions, outputs, and checks rather than merely recommending a skill name. Automatically generated prompts use the Codex-native `$qs-...` skill spelling; legacy explicit `/qs-...` prompts remain valid. Only the Codex composer and its skill picker can resolve a native skill mention into a blue token; a report cannot manufacture that UI state. Model and thinking guidance are explicitly heuristic; they are not measured model performance and never change the active configuration. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and open one full-height, project-first Project Workbench with verified project navigation, searchable actual skill runs, and complete immutable readouts. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

To automatically publish actual skill reports from Linux, macOS, or Windows, `QS_READOUT_PRODUCER_TOKEN` is the only required setting. Configure that authorized token privately; the reporting API derives the producer identity, while the skill automatically identifies the Codex harness and the project from its current working directory. Use the Git origin when available; otherwise derive a safe, stable local-workspace identity without revealing the absolute filesystem path. The default reports endpoint is `https://reports.quickstark.com/api/v1/readouts`; ordinary runs require no project list, owner pattern, producer identifier, harness setting, GitHub verification, Git remote, or locally running viewer. Generate the immutable local report first and present a hosted report URL only after authenticated acceptance. Never expose the private token, mislabel another project, accept unsafe project paths, or claim that a failed submission succeeded.
A completed report displays a compact Skill run metrics section near the top, immediately after Top next prompts. It shows actual skill-attributed model, reasoning effort, provider-reported input and output tokens, total tokens, and active duration only when the running harness or provider genuinely captured them. Show `Not captured` for unavailable values, preserve thread-level evidence under its actual scope, and never invent measurements or attach skill-run metrics to a catalog preview.

When this skill leaves a genuine user action, its readout may include `commands` containing the exact terminal command, a clear title, and a `detail` explaining why or when the user should run it. When actual source deserves attention, its readout may include `keyCode` containing the exact code, language, and optional safe repository-relative file path. Both appear as separate, copyable code blocks. Execution logs and already executed commands are not user instructions; omit both sections when they are not applicable. Never include secrets, credentials, tokens, private keys, invented code, or speculative terminal instructions.

Depending on the actual completed work, tailor one to three top next prompts from:

**1. [`/qs-review-code`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-review-code/SKILL.md)**

Verify that the documentation accurately reflects the actual implementation.

```text
Use $qs-review-code to review these changes for correctness, standards, and requirements.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Code review benefits from deeper correctness, security, and standards analysis.

**2. [`/qs-flow-handoff`](https://github.com/quickstark/skills/blob/main/skills/productivity/qs-flow-handoff/SKILL.md)**

Hand documented operational knowledge and remaining work to the next session.

```text
Use $qs-flow-handoff to prepare a concise handoff so another session can continue this work.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `medium`
>
> Heuristic: A handoff benefits from concise preservation of verified state and decisions.

**3. [`/qs-deploy-release`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-deploy-release/SKILL.md)**

Use the verified deployment documentation when a release is explicitly approved.

```text
Use $qs-deploy-release to verify and run this project's documented release workflow.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `high`
>
> Heuristic: An approved release benefits from deliberate prerequisite and smoke-test checks.

## Where it fits

Documentation follows evidence rather than predicting it:

```text
/qs-code-build or /qs-design-architecture
    ↓
/qs-code-document
    ↓
/qs-review-code
    ↓
/qs-deploy-release, only when explicitly requested
```

Document a completed release afterward when the actual environment, version, deployment URL, commit, pull request, and issue closures can be independently verified.
