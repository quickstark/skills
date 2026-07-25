---
name: qs-deploy-release
description: Verify a project's documented release or deployment workflow, report the exact target and commands, run its prerequisite checks, and deploy only after the user authorizes the specific environment.
---

# QS Deploy: Release

Release or deploy the current project using its existing, documented workflow. Never invent a deployment target, production credential, CI pipeline, release command, or hosting provider.

## 1. Discover the real workflow

Read the project's active instructions, README, package or build scripts, CI workflows, infrastructure configuration, and existing release documentation. Check the current branch, working-tree status, deployment target, and any documented rollback or smoke-test procedure.

Identify:

- The environment: local, preview, staging, or production.
- The exact existing command, CI job, tag, or release process.
- Required tests, type checks, builds, and environment prerequisites.
- Whether the action creates a release, changes external state, or deploys publicly.
- The verification and rollback steps the project already documents.

If the repository does not identify a deployment workflow, stop and ask for the intended provider or documented process. Do not construct a speculative deployment.

## 2. Explain the release

Present a concise release preview containing the project, branch or commit, target environment, commands, expected external changes, prerequisite checks, and rollback route when one exists.

Run read-only discovery and explicitly authorized local checks without additional ceremony. Never print credentials or secret environment values.

## 3. Confirm side effects

Obtain explicit confirmation before publishing, tagging, pushing, triggering CI, changing infrastructure, running database migrations, or deploying to staging or production. Identify the exact environment and command in the confirmation.

If approval is unavailable, a credential is missing, or a permission boundary blocks the action, stop and report what the user must authorize. Never extract, reuse, or search for unrelated credentials.

## 4. Execute and verify

Run only the confirmed, project-documented command. Report its actual result; do not claim success from a submitted job alone.

Perform the documented health check, smoke test, release-state check, or CI verification. If deployment fails, report the failure and the existing rollback procedure. Ask before running a rollback that modifies external state.

Finish with the deployed environment, verified version or commit, checks performed, and any remaining follow-up.

## Completion report and next steps

Finish with a concise, readable completion report. Plain text or restrained Markdown is sufficient; do not create a separate report or HTML file unless this skill's primary workflow requires one.

```text
Status: Completed | Awaiting input | Blocked
Skills used: /qs-deploy-release; /another-skill only if actually used
Outcome: What was completed, discovered, decided, or is blocking progress.
Outputs: Real files, reports, decisions, or changes, when applicable.
Checks: Only the tests, validations, or observations actually performed.
Next best: /qs-skill-name — why it is the best next step.
```

Always include **Status**, **Skills used**, **Outcome**, and **Next best**. Omit **Outputs** or **Checks** when none exist. List only skills that actually ran; a recommendation belongs under **Next best**, not **Skills used**. Never claim a check, artifact, or result you did not verify.

Select at most three genuinely relevant follow-ons from:

- `/qs-review-code` — Resolve a failed pre-deployment review or outstanding release concern.
- `/qs-code-debug` — Diagnose a failed deployment or smoke test.
- `/qs-flow-handoff` — Hand release results and remaining follow-up to the next operator.

Explain why the recommendation advances the actual work. If the request is finished, say `Next best: None — the requested work is complete.` If input or approval is required, name the decision and do not imply that a suggested skill has already run.
