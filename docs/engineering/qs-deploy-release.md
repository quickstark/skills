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

`/qs-deploy-release` generates an architecture-quality, self-contained HTML readout, publishes it through the authenticated `https://reports.quickstark.com/` service using `render --require-hosted`, and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified hosted-domain report URL, real outputs or checks where applicable, and up to three copy-ready top next prompts. Never substitute a local filesystem path, localhost, or private-IP viewer for an actual skill result. Present each complete prompt prominently in its own fenced text code block and place its suggested model and suggested thinking underneath in a visually muted callout. Each prompt embeds its catalog-approved follow-on skill and builds on the actual outcome, findings, decisions, outputs, and checks rather than merely recommending a skill name. Automatically generated prompts use the Codex-native `$qs-...` skill spelling; legacy explicit `/qs-...` prompts remain valid. Only the Codex composer and its skill picker can resolve a native skill mention into a blue token; a report cannot manufacture that UI state. Model and thinking guidance are explicitly heuristic; they are not measured model performance and never change the active configuration. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory for private recovery artifacts. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and open one full-height, project-first Project Workbench with verified project navigation, searchable actual skill runs, and complete immutable readouts. Private viewers remain available only when explicitly requested separately. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

To automatically publish actual skill reports from Linux, macOS, or Windows, `QS_READOUT_PRODUCER_TOKEN` remains the only required setting when no owner-only profile credential is installed. Linux and Windows preserve valid explicit-token precedence. On macOS the renderer first selects the current `.codex` or `.codex-demo` profile's private file or named Keychain token so a shared desktop environment cannot replace that profile's producer; the valid explicit token remains supported when neither profile credential exists. A safely installed machine token and the legacy macOS Keychain entry remain supported. Reject user-home escapes and symbolic links in every profile or credential ancestor. The reporting API derives the producer identity, while the skill automatically identifies the Codex harness and the project from its current working directory. Use the Git origin when available; otherwise derive a safe, stable local-workspace identity without revealing the absolute filesystem path. The default reports endpoint is `https://reports.quickstark.com/api/v1/readouts`; ordinary runs require no project list, owner pattern, producer identifier, harness setting, GitHub verification, Git remote, or private-IP viewer. Generate the immutable local report first and present the hosted `https://reports.quickstark.com/` report URL only after authenticated acceptance. Explicit local, LAN, or SSH viewers remain available. Never expose the private token, mislabel another project, accept unsafe project paths, or claim that a failed submission succeeded.
A completed report displays a compact Skill run metrics section near the top, immediately after Top next prompts. It shows actual skill-attributed model, reasoning effort, provider-reported input and output tokens, total tokens, and active duration only when the running harness or provider genuinely captured them. Show `Not captured` for unavailable values, preserve thread-level evidence under its actual scope, and never invent measurements or attach skill-run metrics to a catalog preview.

When this skill leaves a genuine user action, its readout may include `commands` containing the exact terminal command, a clear title, and a `detail` explaining why or when the user should run it. When actual source deserves attention, its readout may include `keyCode` containing the exact code, language, and optional safe repository-relative file path. Both appear as separate, copyable code blocks. Execution logs and already executed commands are not user instructions; omit both sections when they are not applicable. Never include secrets, credentials, tokens, private keys, invented code, or speculative terminal instructions.

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
