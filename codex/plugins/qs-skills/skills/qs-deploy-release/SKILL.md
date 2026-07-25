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

Finish every invocation with an architecture-quality, self-contained HTML readout and a concise in-chat completion report. Resolve the QuickStark root by walking upward from this skill's `SKILL.md`; both the canonical repository and installed Codex plugin contain `scripts/qs-skill-readout.mjs`.

Write a small JSON input containing the actual skill, status, outcome, findings, decisions, real outputs, checks actually performed, and relevant next skills. Generate the readout with:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --input "<absolute-path-to-readout.json>"
```

The render command automatically starts or reuses a verified readout viewer, selects an available port, and writes a uniquely named, self-contained HTML file. Every promoted skill selects its own compact, purpose-specific report profile; accessible concept maps, evidence charts, review matrices, and check summaries visualize only actual recorded results. OS temporary `quickstark-readouts` storage remains the default. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into the durable, project-organized report library; verified Git identities automatically group immutable reports by project, year, and month. Its gallery provides a project library, searchable project explorer, and actual recent-activity timeline. On macOS or a graphical desktop the private viewer uses localhost. On a headless or SSH-connected Linux dev box it detects the private home-network IP, binds only to that address, protects the viewer with an unguessable URL, and returns a clickable report for a laptop on the same home network. Tailscale is not required. Set `QS_READOUT_ACCESS=ssh` to keep a remote viewer on localhost for explicit SSH forwarding, or `QS_READOUT_ACCESS=local` for local-only access.

Report the verified HTTP(S) readout URL and preserve the real HTML path. Preserve and link the skill's primary artifact when it produces one. Record a missing runtime, denied file access, unavailable home-network route, or failed viewer health check honestly; do not bind to every network interface, claim an unreachable URL, or pretend a readout exists.

```text
Status: Completed | Awaiting input | Blocked
Skills used: /qs-deploy-release; /another-skill only if actually used
Outcome: What was completed, discovered, decided, or is blocking progress.
Readout: Real absolute HTML path or verified private viewer URL.
Outputs: Real files, reports, decisions, or changes, when applicable.
Checks: Only the tests, validations, or observations actually performed.
Next best: /qs-skill-name — why it is the best next step.
```

Always include **Status**, **Skills used**, **Outcome**, **Readout**, and **Next best**. When the readout cannot be created, state `Readout: Not created —` and the actual reason. Omit **Outputs** or **Checks** when none exist. List only skills that actually ran; a recommendation belongs under **Next best**, not **Skills used**. Never claim a check, artifact, URL, or result you did not verify.

Select at most three genuinely relevant follow-ons from:

- `/qs-review-code` — Resolve a failed pre-deployment review or outstanding release concern.
- `/qs-code-debug` — Diagnose a failed deployment or smoke test.
- `/qs-flow-handoff` — Hand release results and remaining follow-up to the next operator.

Explain why the recommendation advances the actual work. If the request is finished, say `Next best: None — the requested work is complete.` If input or approval is required, name the decision and do not imply that a suggested skill has already run.
