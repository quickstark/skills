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

Finish with the deployed environment, verified version or commit, checks performed, and any remaining follow-up. When a GitHub release actually exists, record its verified version and URL, the actual merged pull request, the published commit hash, and only issues independently confirmed as closed by that exact release. Distinguish a deployed local commit from a published release; a version in `package.json`, a local tag, or `Closes #123` in a commit does not establish GitHub publication or issue closure.

## Completion report and next steps

Finish every invocation with an architecture-quality, self-contained HTML readout and a concise in-chat completion report. Resolve the QuickStark root by walking upward from this skill's `SKILL.md`; both the canonical repository and installed Codex plugin contain `scripts/qs-skill-readout.mjs`.

Write a small JSON input containing the actual skill, status, outcome, findings, decisions, real outputs, checks actually performed, and up to three relevant `nextSkills` objects containing `name`, `reason`, and a copy-ready `prompt`. Each prompt explicitly invokes its catalog-approved skill and carries forward the actual outcome, findings, decisions, outputs, and checks relevant to that follow-on. Present each full prompt in its own fenced text code block. Put its suggested model and thinking level in a visually muted callout underneath. Optionally supply `model`, `thinking`, and `modelReason` when the actual remaining work justifies a more specific heuristic suggestion. Record only directly verified execution context, delivery provenance, or relationships. Generate the readout with:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --input "<absolute-path-to-readout.json>"
```

The render command automatically starts or reuses a verified readout viewer, selects an available port, and writes a uniquely named, self-contained HTML file. Every promoted skill selects its own compact, purpose-specific report profile; accessible concept maps, evidence charts, review matrices, and check summaries visualize only actual recorded results. OS temporary `quickstark-readouts` storage remains the default. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into the durable, project-organized report library; verified Git identities automatically group immutable reports by project, year, and month. Its gallery provides a project library, searchable project explorer, and actual recent-activity timeline. On macOS or a graphical desktop the private viewer uses localhost. On a headless or SSH-connected Linux dev box it detects the private home-network IP, binds only to that address, protects the viewer with an unguessable URL, and returns a clickable report for a laptop on the same home network. Tailscale is not required. Set `QS_READOUT_ACCESS=ssh` to keep a remote viewer on localhost for explicit SSH forwarding, or `QS_READOUT_ACCESS=local` for local-only access.

The renderer automatically captures the actual execution machine and platform for every real skill run. Add `execution.deployments` only for directly observed environments, deployment states, and safe verified HTTP(S) URLs. Add `execution.files` only for repository-relative files this skill actually added, modified, deleted, or renamed, with a concise accurate change summary. Preserve unrelated existing work; never infer run-owned files from an already dirty worktree or expose secrets, `.env` files, credentials, absolute machine paths, or unverified deployment targets. Previews never claim an execution machine, deployment, or changed file.

When this run actually touches GitHub, a merge, or a release, add an optional `provenance` object containing only observed `pullRequests`, `closedIssues`, `release`, and `commit`. Verify GitHub numbers, record state, HTTPS links, repository ownership, release version, and complete Git hash. Set `commit.published` only after confirming remote publication; set `closedByRelease` only after independently confirming that exact release closed the issue. Omit missing evidence entirely. Record `relationships` only between observed findings, decisions, outputs, or checks; review findings may carry their actual `standards` or `specification` axis and `P0`–`P3` priority. Previews never contain delivery provenance or observed relationships.

Report the verified HTTP(S) readout URL and preserve the real HTML path. Preserve and link the skill's primary artifact when it produces one. Record a missing runtime, denied file access, unavailable home-network route, or failed viewer health check honestly; do not bind to every network interface, claim an unreachable URL, or pretend a readout exists.

```text
Status: Completed | Awaiting input | Blocked
Skills used: /qs-deploy-release; /another-skill only if actually used
Outcome: What was completed, discovered, decided, or is blocking progress.
Execution: Actual machine, with verified deployment and changed files when applicable.
Readout: Real absolute HTML path or verified private viewer URL.
Outputs: Real files, reports, decisions, or changes, when applicable.
Checks: Only the tests, validations, or observations actually performed.
Delivery: Verified PRs, closed issues, release, or commit, only when applicable.
```

**Top next prompts:**

**1. Recommended continuation**

Resolve a failed pre-deployment review or outstanding release concern.

```text
Use /qs-review-code to review these changes for correctness, standards, and requirements.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Code review benefits from deeper correctness, security, and standards analysis. Never change the active model or thinking level.

Use the same fenced-prompt and muted callout format for at most two genuinely relevant alternatives.

Always include **Status**, **Skills used**, **Outcome**, **Execution**, **Readout**, and **Top next prompts**. Make each complete, copy-ready prompt the visual focus in a fenced text code block. Place **Suggested model** and **Suggested thinking** underneath in a muted blockquote callout, label both as heuristic, and never change the active model or thinking level. These suggestions are not observed run measurements, comparative benchmarks, independently verified quality, or automatic model changes. When the readout cannot be created, state `Readout: Not created —` and the actual reason. Omit deployment details, changed files, **Outputs**, **Checks**, or **Delivery** when no corresponding evidence exists. List only skills that actually ran; suggested prompts belong under **Top next prompts**, not **Skills used**. Never claim a machine, check, changed file, artifact, issue, pull request, release, URL, or result you did not verify.

Select at most three genuinely relevant, copy-ready prompt directions from:

**1. `/qs-review-code`**

Resolve a failed pre-deployment review or outstanding release concern.

```text
Use /qs-review-code to review these changes for correctness, standards, and requirements.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Code review benefits from deeper correctness, security, and standards analysis.

**2. `/qs-code-debug`**

Diagnose a failed deployment or smoke test.

```text
Use /qs-code-debug to reproduce, diagnose, and fix this bug with a regression test.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Debugging benefits from tracing failure evidence back to its actual cause.

**3. `/qs-flow-handoff`**

Hand release results and remaining follow-up to the next operator.

```text
Use /qs-flow-handoff to prepare a concise handoff so another session can continue this work.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `medium`
>
> Heuristic: A handoff benefits from concise preservation of verified state and decisions.

Tailor every selected prompt to this run's actual outcome and recorded evidence; the catalog wording is a starting point, not a substitute for the accomplished work. Explain why the prompt advances the actual remaining work. If the request is finished, say `Top next prompts: None — the requested work is complete.` If input or approval is required, name the decision and do not imply that a suggested skill has already run.
