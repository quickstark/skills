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

Write a small JSON input containing the actual skill, status, outcome, findings, decisions, real outputs, checks actually performed, relevant next skills, and only directly verified execution context, delivery provenance, or relationships. Generate the readout with:

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
Next best: /qs-skill-name — why it is the best next step.
```

Always include **Status**, **Skills used**, **Outcome**, **Execution**, **Readout**, and **Next best**. When the readout cannot be created, state `Readout: Not created —` and the actual reason. Omit deployment details, changed files, **Outputs**, **Checks**, or **Delivery** when no corresponding evidence exists. List only skills that actually ran; a recommendation belongs under **Next best**, not **Skills used**. Never claim a machine, check, changed file, artifact, issue, pull request, release, URL, or result you did not verify.

Select at most three genuinely relevant follow-ons from:

- `/qs-review-code` — Verify that the documentation accurately reflects the actual implementation.
- `/qs-flow-handoff` — Hand documented operational knowledge and remaining work to the next session.
- `/qs-deploy-release` — Use the verified deployment documentation when a release is explicitly approved.

Explain why the recommendation advances the actual work. If the request is finished, say `Next best: None — the requested work is complete.` If input or approval is required, name the decision and do not imply that a suggested skill has already run.
