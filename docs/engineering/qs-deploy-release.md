Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/quickstark)

## What it does

`qs-deploy-release` discovers and verifies the release process that a project already documents. It does not invent a hosting provider, deployment command, environment, credential, or CI pipeline.

## When to reach for it

Invoke it by typing `/qs-deploy-release`; the agent cannot start it automatically. Use it when code is ready and you want the project's actual preview, staging, production, or release workflow inspected and executed safely.

The skill obtains explicit confirmation before pushing, publishing, tagging, migrating a database, triggering CI, changing infrastructure, or deploying to a remote environment.

## Prerequisites

The project must document its deployment process or the user must identify the intended provider and workflow. Use `/qs-review-code` first when the change still requires review, and run the project's documented release checks before the deployment.

## It is working if

- The target environment and exact command are stated before execution.
- Tests and release prerequisites are verified.
- No credentials are printed or invented.
- Production and other external changes wait for explicit approval.
- The result is checked against an actual smoke test, health check, CI run, or release record.

## Output and next steps

`/qs-deploy-release` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and up to three copy-ready top next prompts. Present each complete prompt prominently in its own fenced text code block and place its suggested model and suggested thinking underneath in a visually muted callout. Each prompt embeds its catalog-approved follow-on skill and builds on the actual outcome, findings, decisions, outputs, and checks rather than merely recommending a skill name. Automatically generated prompts use the Codex-native `$qs-...` skill spelling; legacy explicit `/qs-...` prompts remain valid. Only the Codex composer and its skill picker can resolve a native skill mention into a blue token; a report cannot manufacture that UI state. Model and thinking guidance are explicitly heuristic; they are not measured model performance and never change the active configuration. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and open one full-height, project-first Project Workbench with verified project navigation, searchable actual skill runs, and complete immutable readouts. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

Depending on the actual completed work, tailor one to three top next prompts from:

**1. [`/qs-review-code`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-review-code/SKILL.md)**

Resolve a failed pre-deployment review or outstanding release concern.

```text
Use $qs-review-code to review these changes for correctness, standards, and requirements.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Code review benefits from deeper correctness, security, and standards analysis.

**2. [`/qs-code-debug`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-code-debug/SKILL.md)**

Diagnose a failed deployment or smoke test.

```text
Use $qs-code-debug to reproduce, diagnose, and fix this bug with a regression test.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Debugging benefits from tracing failure evidence back to its actual cause.

**3. [`/qs-flow-handoff`](https://github.com/quickstark/skills/blob/main/skills/productivity/qs-flow-handoff/SKILL.md)**

Hand release results and remaining follow-up to the next operator.

```text
Use $qs-flow-handoff to prepare a concise handoff so another session can continue this work.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `medium`
>
> Heuristic: A handoff benefits from concise preservation of verified state and decisions.

## Where it fits

`/qs-deploy-release` is the final step after `/qs-code-build`, `/qs-test-tdd`, and `/qs-review-code`. Use `/qs-help` when you need the complete engineering workflow.
