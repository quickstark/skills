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

## Where it fits

`/qs-deploy-release` is the final step after `/qs-code-build`, `/qs-test-tdd`, and `/qs-review-code`. Use `/qs-help` when you need the complete engineering workflow.
