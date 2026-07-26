---
name: qs-code-document
description: Document verified project behavior, code changes, architecture, deployment, runbooks, README files, or release notes. Use when documentation must be created, refreshed, or checked against the actual implementation.
---

# QS Code: Document

Write documentation that reflects the project as it actually exists. Treat implementation, tests, configuration, verified deployment evidence, and existing project conventions as the authoritative sources.

## 1. Identify the documentation audience and scope

Determine whether the user needs a project README, setup guide, API reference, architectural decision, module description, operational runbook, deployment guide, migration note, release note, or another explicitly requested document.

Read the relevant `AGENTS.md`, project documentation, existing README, implementation, tests, and actual configuration. Identify the audience, canonical document location, affected code, and facts that can be independently verified.

Done when the intended document, audience, source material, and in-scope files are known.

## 2. Establish verified facts

Trace commands, configuration, interfaces, module relationships, changed files, and deployment behavior to actual project sources. Run existing read-only discovery or approved documentation checks when needed.

Distinguish local changes from published commits. Include a deployed URL, environment, release version, pull request, or closed issue only when its actual state has been verified. Record unknown configuration, missing prerequisites, and remaining decisions as unresolved.

Done when every material statement and example has an identified project source.

## 3. Update the authoritative document

Prefer updating the document the project already uses. Create a new document only when its audience or purpose has no existing home.

Lead with what the reader needs to do or understand. Keep instructions concise, use the project's actual vocabulary and repository-relative file paths, and include only working commands, real links, observed architecture, and verified examples.

Keep credentials, secret environment values, internal absolute paths, speculative infrastructure, fabricated release notes, and entire execution logs out of the document.

Done when the document accurately answers the user's request and each changed file is accounted for.

## 4. Verify and report

Run available documentation validation, relevant tests, link checks, or repository synchronization. Verify that documented commands, code paths, deployment URLs, version numbers, and changed-file descriptions agree with actual observed behavior.

Report the real execution machine, documentation files actually created or modified, validations performed, relevant deployment evidence, and remaining unknowns. Record GitHub and release provenance only when independently verified.

Done when the documentation, changed-file list, and reported checks are independently verifiable.

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
Skills used: /qs-code-document; /another-skill only if actually used
Outcome: What was completed, discovered, decided, or is blocking progress.
Execution: Actual machine, with verified deployment and changed files when applicable.
Readout: Real absolute HTML path or verified private viewer URL.
Outputs: Real files, reports, decisions, or changes, when applicable.
Checks: Only the tests, validations, or observations actually performed.
Delivery: Verified PRs, closed issues, release, or commit, only when applicable.
```

**Top next prompts:**

**1. Recommended continuation**

Verify that the documentation accurately reflects the actual implementation.

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

Verify that the documentation accurately reflects the actual implementation.

```text
Use /qs-review-code to review these changes for correctness, standards, and requirements.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Code review benefits from deeper correctness, security, and standards analysis.

**2. `/qs-flow-handoff`**

Hand documented operational knowledge and remaining work to the next session.

```text
Use /qs-flow-handoff to prepare a concise handoff so another session can continue this work.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `medium`
>
> Heuristic: A handoff benefits from concise preservation of verified state and decisions.

**3. `/qs-deploy-release`**

Use the verified deployment documentation when a release is explicitly approved.

```text
Use /qs-deploy-release to verify and run this project's documented release workflow.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `high`
>
> Heuristic: An approved release benefits from deliberate prerequisite and smoke-test checks.

Tailor every selected prompt to this run's actual outcome and recorded evidence; the catalog wording is a starting point, not a substitute for the accomplished work. Explain why the prompt advances the actual remaining work. If the request is finished, say `Top next prompts: None — the requested work is complete.` If input or approval is required, name the decision and do not imply that a suggested skill has already run.
