---
name: qs-git-merge
description: "Safely inspect and complete actual Git integration, GitHub pull requests, approved publication, and merge or rebase conflicts."
---

1. **Verify the actual Git and GitHub state.** Check the current branch, tracked remote, default branch, local commits, upstream divergence, in-progress merge or rebase, and any existing GitHub pull request. Use the configured GitHub MCP or authenticated `gh` CLI for directly observed remote state. Never infer a merge, pull request, publication, issue closure, or release from a local commit.

2. **Choose only the integration path that actually applies.** If reviewed commits are already on the default branch and ahead of `origin`, no branch merge is required: `git push origin main` is the correct publication step only when explicitly requested or approved. If the work is on a feature branch, verify whether it needs an explicitly approved branch push, pull-request creation, pull-request checks, or pull-request merge. If a Git merge or rebase is already in progress, inspect its actual conflicting files. If nothing is pending, report that there is nothing to integrate or publish.

3. **Preserve conflict intent when conflicts actually exist.** Read each side's commit, pull request, and issue evidence before resolving a hunk. Preserve both intentions when compatible; otherwise record the trade-off matching the requested integration. Do not invent behavior, create a conflict, or abort an in-progress operation.

4. **Verify before external delivery.** Run the project's actual automated checks and inspect required pull-request checks. Address failed checks or review findings before publishing or merging. Preserve unrelated worktree changes; never stage a user-owned prototype, configuration, or unrelated change.

5. **Finish only the explicitly authorized operation.** Complete an actual merge or rebase, push approved changes to `origin`, or create or merge the explicitly approved GitHub pull request. Never push to `upstream`; it is a read-only attribution reference. Do not bypass protected branches, required checks, review rules, or authentication.

6. **Independently verify delivery.** Confirm the published remote branch and exact commit using Git or GitHub. Include a pull-request URL and merged state only after observing the real pull request. A release remains a separate `/qs-deploy-release` step that requires its own explicit approval; publishing a branch is not a deployment or release.

## Completion report and next steps

Finish every invocation with an architecture-quality, self-contained HTML readout and a concise in-chat completion report. Resolve the QuickStark root by walking upward from this skill's `SKILL.md`; both the canonical repository and installed Codex plugin contain `scripts/qs-skill-readout.mjs`.

Write a small JSON input containing the actual skill, status, outcome, findings, decisions, real outputs, checks actually performed, and up to three relevant `nextSkills` objects containing `name`, `reason`, and a copy-ready `prompt`. Each prompt explicitly invokes its catalog-approved skill and carries forward the actual outcome, findings, decisions, outputs, and checks relevant to that follow-on. Use the Codex-native `$qs-...` skill spelling for automatically generated follow-on prompts; existing explicit `/qs-...` prompts remain supported. A resolved blue skill mention is controlled by the Codex composer and its skill picker, not by HTML, Markdown, clipboard text, or the readout viewer. Present each full prompt in its own fenced text code block. Put its suggested model and thinking level in a visually muted callout underneath. Optionally supply `model`, `thinking`, and `modelReason` when the actual remaining work justifies a more specific heuristic suggestion. Record only directly verified execution context, delivery provenance, or relationships.

Include `commands` only when the user actually needs to run an installation, debugging, verification, setup, or other terminal command after the skill completes. Each recorded command must contain a concise `title`, the exact copyable `command`, and a `detail` explaining why or when the user should run it. Never present already executed checks, execution logs, or the skill's own command transcript as pending user actions. Include `keyCode` only for an actual source excerpt the user needs to inspect, using a concise `title`, exact `code`, a safe `language`, and an optional repository-relative `path` and explanatory `detail`. Render both as separate, safely escaped code blocks. Omit both sections when no user action or noteworthy code exists. Never expose secrets, credentials, tokens, private keys, sensitive files, speculative instructions, or invented code; previews cannot claim commands or recorded source.

Generate the readout with:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --input "<absolute-path-to-readout.json>"
```

To automatically publish every actual skill report from Linux, macOS, or Windows, `QS_READOUT_PRODUCER_TOKEN` is the only required setting. Supply its authorized bearer value through the machine's private credential configuration; the reports API authenticates the token and derives the producer identity. The renderer automatically uses `https://reports.quickstark.com/api/v1/readouts`, identifies the Codex harness, and derives the project from the skill's actual working directory, using its Git origin when available or a safely fingerprinted local workspace when no remote exists. Do not configure project names, owners, producer identifiers, or harness metadata for ordinary skill runs. Token authentication, not GitHub ownership, authorizes publication; never mislabel a report as a different project or expose an absolute local path. The ordinary render command writes an immutable local report, publishes the structured result without starting a local viewer, and returns a hosted URL only after authenticated delivery succeeds. Never commit, print, reuse across security boundaries, or embed a bearer token in a report. If the private token, safe current-project identity, or hosted delivery is unavailable, preserve the local report and report the actual failure.
Include an optional `observation` only for directly observed Codex or provider measurements. A clearly identified `skill-run` may display its actual model, reasoning effort, final-response token counts, and active duration in the compact Skill run metrics section immediately after Top next prompts. Display unavailable values as `Not captured`; never estimate usage, promote a suggested configuration into a measurement, or attribute thread-turn or cumulative telemetry to an individual skill. An unrun preview never displays skill-run metrics.

The render command automatically starts or reuses a verified readout viewer, selects an available port, and writes a uniquely named, self-contained HTML file. Every promoted skill selects its own compact, purpose-specific report profile; accessible concept maps, evidence charts, review matrices, and check summaries visualize only actual recorded results. OS temporary `quickstark-readouts` storage remains the default. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into the durable, project-organized report library; verified Git identities automatically group immutable reports by project, year, and month. Its full-height, project-first Project Workbench integrates verified project navigation, searchable actual skill runs, and complete immutable readouts in one responsive page. On macOS or a graphical desktop the private viewer uses localhost. On a headless or SSH-connected Linux dev box it detects the private home-network IP, binds only to that address, protects the viewer with an unguessable URL, and returns a clickable report for a laptop on the same home network. Tailscale is not required. Set `QS_READOUT_ACCESS=ssh` to keep a remote viewer on localhost for explicit SSH forwarding, or `QS_READOUT_ACCESS=local` for local-only access.

The renderer automatically captures the actual execution machine and platform for every real skill run. Add `execution.deployments` only for directly observed environments, deployment states, and safe verified HTTP(S) URLs. Add `execution.files` only for repository-relative files this skill actually added, modified, deleted, or renamed, with a concise accurate change summary. Preserve unrelated existing work; never infer run-owned files from an already dirty worktree or expose secrets, `.env` files, credentials, absolute machine paths, or unverified deployment targets. Previews never claim an execution machine, deployment, or changed file.

When this run actually touches GitHub, a merge, or a release, add an optional `provenance` object containing only observed `pullRequests`, `closedIssues`, `release`, and `commit`. Verify GitHub numbers, record state, HTTPS links, repository ownership, release version, and complete Git hash. Set `commit.published` only after confirming remote publication; set `closedByRelease` only after independently confirming that exact release closed the issue. Omit missing evidence entirely. Record `relationships` only between observed findings, decisions, outputs, or checks; review findings may carry their actual `standards` or `specification` axis and `P0`–`P3` priority. Previews never contain delivery provenance or observed relationships.

Report the verified HTTP(S) readout URL and preserve the real HTML path. When a skill produces a standalone visual artifact, publish its primary visual with `node "<QuickStark root>/scripts/qs-skill-readout.mjs" visual --skill "<actual-skill>" --input "<absolute-path-to-visual.html>" --json`; use the returned, independently verified HTTP(S) browser URL as the primary visual link. Never present a `/tmp` filesystem path, `file:` link, or editor-opening HTML attachment as a website. Preserve the source path as secondary evidence, not as the browser destination. Record a missing runtime, denied file access, unavailable home-network route, or failed viewer health check honestly; do not bind to every network interface, claim an unreachable URL, or pretend a readout or browser visual exists.

```text
Status: Completed | Awaiting input | Blocked
Skills used: /qs-git-merge; /another-skill only if actually used
Outcome: What was completed, discovered, decided, or is blocking progress.
Execution: Actual machine, with verified deployment and changed files when applicable.
Readout: Real absolute HTML path or verified private viewer URL.
Outputs: Real files, reports, decisions, or changes, when applicable.
Checks: Only the tests, validations, or observations actually performed.
Commands: Only terminal commands the user actually needs to run, when applicable.
Key code: Only actual, relevant source excerpts, when applicable.
Delivery: Verified PRs, closed issues, release, or commit, only when applicable.
```

**Top next prompts:**

**1. Recommended continuation**

Verify that Git integration or conflict resolution preserved observable behavior.

```text
Use $qs-test-tdd to implement this behavior using a red-green test-driven loop.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `high`
>
> Heuristic: Test-driven work benefits from reasoning through behavior and regression seams. Never change the active model or thinking level.

Use the same fenced-prompt and muted callout format for at most two genuinely relevant alternatives.

Always include **Status**, **Skills used**, **Outcome**, **Execution**, **Readout**, and **Top next prompts**. Make each complete, copy-ready prompt the visual focus in a fenced text code block. Place **Suggested model** and **Suggested thinking** underneath in a muted blockquote callout, label both as heuristic, and never change the active model or thinking level. These suggestions are not observed run measurements, comparative benchmarks, independently verified quality, or automatic model changes. When the readout cannot be created, state `Readout: Not created —` and the actual reason. Omit deployment details, changed files, **Outputs**, **Checks**, **Commands**, **Key code**, or **Delivery** when no corresponding evidence exists. List only skills that actually ran; suggested prompts belong under **Top next prompts**, not **Skills used**. Never claim a machine, check, changed file, artifact, issue, pull request, release, URL, or result you did not verify.

Select at most three genuinely relevant, copy-ready prompt directions from:

**1. `/qs-test-tdd`**

Verify that Git integration or conflict resolution preserved observable behavior.

```text
Use $qs-test-tdd to implement this behavior using a red-green test-driven loop.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `high`
>
> Heuristic: Test-driven work benefits from reasoning through behavior and regression seams.

**2. `/qs-review-code`**

Review the integrated changes, actual branch state, and any conflict resolution.

```text
Use $qs-review-code to review these changes for correctness, standards, and requirements.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Code review benefits from deeper correctness, security, and standards analysis.

**3. `/qs-deploy-release`**

Run the documented release workflow only after GitHub publication is verified and deployment is explicitly approved.

```text
Use $qs-deploy-release to verify and run this project's documented release workflow.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `high`
>
> Heuristic: An approved release benefits from deliberate prerequisite and smoke-test checks.

Tailor every selected prompt to this run's actual outcome and recorded evidence; the catalog wording is a starting point, not a substitute for the accomplished work. Explain why the prompt advances the actual remaining work. If the request is finished, say `Top next prompts: None — the requested work is complete.` If input or approval is required, name the decision and do not imply that a suggested skill has already run.
