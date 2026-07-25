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

`/qs-deploy-release` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, the verified viewer link and real readout path, real outputs or checks where applicable, and the best next step. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and browse verified projects, searchable reports, and actual recent activity. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

Depending on what actually happened, the next step may be:

- [`/qs-review-code`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-review-code/SKILL.md) — Resolve a failed pre-deployment review or outstanding release concern.
- [`/qs-code-debug`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-code-debug/SKILL.md) — Diagnose a failed deployment or smoke test.
- [`/qs-flow-handoff`](https://github.com/quickstark/skills/blob/main/skills/productivity/qs-flow-handoff/SKILL.md) — Hand release results and remaining follow-up to the next operator.

## Where it fits

`/qs-deploy-release` is the final step after `/qs-code-build`, `/qs-test-tdd`, and `/qs-review-code`. Use `/qs-help` when you need the complete engineering workflow.
