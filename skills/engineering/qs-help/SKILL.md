---
name: qs-help
description: Identify the right QuickStark skill, explain each skill's purpose, and route new features, refactors, bugs, and releases through the correct order of operations.
disable-model-invocation: true
---

# QS Help

Orient the user. Identify the actual situation and offer up to three copy-ready next prompts, ordered by the work already accomplished. Put each complete prompt in its own prominent fenced text code block. Embed the appropriate `/qs-` skill, carry forward the actual decisions and evidence, and place a suitable heuristic model and thinking level in a muted callout underneath. Explain why the first action comes before the alternatives. A suggested skill has not run; begin implementation, review, deployment, or other follow-on work only when the user actually requests it. Never automatically change the active model or thinking level.

## Choose the right starting point

- **New project or unconfigured repository:** start with `/qs-setup`.
- **New feature in an existing codebase:** start with `/qs-plan-clarify`.
- **Idea without a codebase:** start with `/qs-plan-explore`.
- **Large, uncertain, multi-session effort:** start with `/qs-plan-roadmap`.
- **Refactoring or structural friction:** start with `/qs-design-architecture`.
- **Reproducible bug or regression:** start with `/qs-code-debug`.
- **Missing, outdated, or unverified project documentation:** start with `/qs-code-document`.
- **Incoming reports or requests:** start with `/qs-flow-triage`.
- **Reviewed work awaiting GitHub integration, pull-request delivery, or conflict resolution:** start with `/qs-git-merge`.
- **Completed, reviewed change ready for a documented release:** start with `/qs-deploy-release`.

Offer only prompts that fit the situation. A tiny, already-understood change does not need a roadmap, a prototype, a specification, and tickets simply because those skills exist.

## Order of operations: new work

1. **Configure — `/qs-setup`.** Set up the project's tracker, triage vocabulary, and domain-document locations. Run this once per project; skip it when the configuration already exists.
2. **Clarify — `/qs-plan-clarify` or `/qs-plan-explore`.** Use `/qs-plan-clarify` for a real codebase and durable decisions; use `/qs-plan-explore` for an early, stateless idea. `/qs-plan-interview` supplies the focused questioning discipline when needed.
3. **Map large work — `/qs-plan-roadmap`.** Use this only when the work is too large or uncertain for one agent session. Resolve decisions before pretending the implementation is specified.
4. **Research unknowns — `/qs-plan-research`.** Check primary sources when a technical, product, or operational question cannot be answered reliably from the current project.
5. **Define the domain — `/qs-design-domain`.** Settle ambiguous concepts, project vocabulary, and architectural decisions before those ambiguities spread into code.
6. **Prototype uncertainty — `/qs-design-prototype`.** Build disposable proof only when an interface, interaction, state model, or behavior needs a concrete answer.
7. **Write the specification — `/qs-plan-spec`.** Capture already agreed requirements; do not reopen decisions or start another interview.
8. **Split substantial work — `/qs-plan-tickets`.** Produce dependency-aware, independently actionable tickets when the specification is too large for one implementation. Skip tickets for a small change.
9. **Design the seam — `/qs-design-modules`.** Define a small interface and deep implementation when a new module or significant boundary is involved.
10. **Build and test — `/qs-code-build` with `/qs-test-tdd`.** Implement the next agreed change or unblocked ticket. Write behavior-focused tests at confirmed seams; run one ticket per fresh session when the work was split.
11. **Document verified behavior — `/qs-code-document`.** Update the actual README, module documentation, runbook, architecture note, or release documentation when the completed change requires it.
12. **Review — `/qs-review-code`.** Check requirements, correctness, regressions, documentation, and repository standards. Address findings before integration.
13. **Integrate and verify GitHub delivery — `/qs-git-merge`.** Inspect the actual branch, tracked remote, upstream divergence, GitHub pull request, and any in-progress conflict. A reviewed commit already on `main` needs an explicitly approved `git push origin main`, not a fabricated merge; a feature branch may need an explicitly approved push, pull request, checks, and merge. Verify the remote result before claiming publication.
14. **Release — `/qs-deploy-release`.** Use only the actual, documented deployment workflow. Verify prerequisites and obtain separate explicit approval before any production, publishing, infrastructure, migration, or other external change.

For small changes, the effective route is often `/qs-plan-clarify` → `/qs-code-build` → `/qs-test-tdd` → `/qs-review-code` → `/qs-git-merge`. Include `/qs-deploy-release` only when the user has actually requested deployment.

## Order of operations: refactoring

1. **Configure if needed — `/qs-setup`.** Confirm tracker and documentation conventions before creating refactoring artifacts.
2. **Find the real problem — `/qs-design-architecture`.** Inspect current architecture and recent change hotspots. Present ranked candidates, a visual report where useful, and one justified recommendation.
3. **Choose one candidate.** Ask the user which refactor to pursue; do not silently redesign unrelated modules or start implementation.
4. **Clarify boundaries — `/qs-plan-clarify`.** Agree on the behavior that must not change, the files in scope, constraints, and success criteria.
5. **Design the target — `/qs-design-modules` and `/qs-design-domain`.** Define the improved seam, module interface, and correct domain vocabulary.
6. **Protect existing behavior — `/qs-test-tdd`.** Establish characterization or regression coverage before changing production behavior.
7. **Specify or slice when justified — `/qs-plan-spec` and `/qs-plan-tickets`.** Document meaningful, multi-session work. Skip both for a small, clear refactor.
8. **Make the change — `/qs-code-build`.** Refactor in small, tested steps while preserving the agreed external behavior.
9. **Document changed architecture — `/qs-code-document`.** Update verified module boundaries, interfaces, architecture records, and any affected operational guidance.
10. **Review — `/qs-review-code`.** Verify the architectural improvement, unchanged behavior, documentation, test quality, and project standards.
11. **Integrate and verify GitHub delivery — `/qs-git-merge`.** Select only the actual, explicitly authorized branch push, pull request, merge, or conflict-resolution operation; verify its remote state.
12. **Release only when requested — `/qs-deploy-release`.** Follow the existing release process and require separate explicit authorization for deployment.

When the starting point is an observed failure, use `/qs-code-debug` before an architectural review. Do not use a speculative refactor as a substitute for reproducing a bug.

## Every skill and its purpose

| Skill | Purpose |
| --- | --- |
| `/qs-help` | Choose the right workflow and explain the correct order of operations. |
| `/qs-setup` | Configure the current project's issue tracker, labels, and documentation. |
| `/qs-plan-clarify` | Resolve feature or refactoring requirements and record durable decisions. |
| `/qs-plan-explore` | Explore an early idea that does not yet belong to a codebase. |
| `/qs-plan-interview` | Ask focused questions that resolve a plan or decision. |
| `/qs-plan-spec` | Turn an agreed conversation into an actionable specification. |
| `/qs-plan-tickets` | Split a specification into small, dependency-aware tickets. |
| `/qs-plan-roadmap` | Map a large, uncertain project into decision-sized work. |
| `/qs-plan-research` | Research an unknown against reliable, primary sources. |
| `/qs-design-prototype` | Build a disposable prototype to answer a specific design question. |
| `/qs-design-domain` | Define project terminology, domain concepts, and durable decisions. |
| `/qs-design-modules` | Design small interfaces, clean seams, and deep software modules. |
| `/qs-design-architecture` | Find, visualize, and prioritize worthwhile architectural refactors. |
| `/qs-code-build` | Implement a specification, ticket, or agreed small change. |
| `/qs-code-document` | Write accurate project documentation from verified code and operational behavior. |
| `/qs-code-debug` | Reproduce, diagnose, and fix a bug or regression. |
| `/qs-test-tdd` | Write behavior-focused tests and drive a red-green implementation loop. |
| `/qs-review-code` | Review a change against its requirements and coding standards. |
| `/qs-git-merge` | Verify and complete approved GitHub integration, publication, pull requests, and actual conflicts. |
| `/qs-flow-triage` | Turn incoming reports and requests into actionable work. |
| `/qs-flow-handoff` | Preserve essential work and recommendations for the next session. |
| `/qs-learn-teach` | Teach a subject through a stateful, guided learning workflow. |
| `/qs-skill-write` | Create or improve a focused and reliable agent skill. |
| `/qs-deploy-release` | Verify and run a documented release after explicit approval. |

## Context and handoffs

Keep clarification, design, specifications, and ticket breakdown in one coherent session when practical. Once tickets are ready, implement each ticket in a fresh session.

Use `/qs-flow-handoff` before crossing sessions when the next agent needs decisions, artifact paths, open questions, or a context-aware next prompt with its embedded skill. Do not copy secrets, entire transcripts, or content that already exists in a specification, ticket, ADR, commit, or report.

Use `/compact` only when continuing the same conversation; use `/qs-flow-handoff` when a different session must continue the work.

## Completion report and next steps

Finish every invocation with an architecture-quality, self-contained HTML readout and a concise in-chat completion report. Resolve the QuickStark root by walking upward from this skill's `SKILL.md`; both the canonical repository and installed Codex plugin contain `scripts/qs-skill-readout.mjs`.

Write a small JSON input containing the actual skill, status, outcome, findings, decisions, real outputs, checks actually performed, and up to three relevant `nextSkills` objects containing `name`, `reason`, and a copy-ready `prompt`. Each prompt explicitly invokes its catalog-approved skill and carries forward the actual outcome, findings, decisions, outputs, and checks relevant to that follow-on. Use the Codex-native `$qs-...` skill spelling for automatically generated follow-on prompts; existing explicit `/qs-...` prompts remain supported. A resolved blue skill mention is controlled by the Codex composer and its skill picker, not by HTML, Markdown, clipboard text, or the readout viewer. Present each full prompt in its own fenced text code block. Put its suggested model and thinking level in a visually muted callout underneath. Optionally supply `model`, `thinking`, and `modelReason` when the actual remaining work justifies a more specific heuristic suggestion. Record only directly verified execution context, delivery provenance, or relationships.

Include `commands` only when the user actually needs to run an installation, debugging, verification, setup, or other terminal command after the skill completes. Each recorded command must contain a concise `title`, the exact copyable `command`, and a `detail` explaining why or when the user should run it. Never present already executed checks, execution logs, or the skill's own command transcript as pending user actions. Include `keyCode` only for an actual source excerpt the user needs to inspect, using a concise `title`, exact `code`, a safe `language`, and an optional repository-relative `path` and explanatory `detail`. Render both as separate, safely escaped code blocks. Omit both sections when no user action or noteworthy code exists. Never expose secrets, credentials, tokens, private keys, sensitive files, speculative instructions, or invented code; previews cannot claim commands or recorded source.

Generate the readout with:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --input "<absolute-path-to-readout.json>"
```

To automatically publish every actual skill report from Linux, macOS, or Windows, `QS_READOUT_PRODUCER_TOKEN` remains the only required setting when no securely installed profile credential is available. On Linux and Windows the renderer first uses a valid explicit token. On macOS it first securely discovers the owner-only file or named Keychain credential belonging to the current `.codex` or `.codex-demo` profile, so an inherited shared desktop token never replaces another profile's producer; the valid explicit token remains the fallback when that profile has neither credential. Standard private machine files and the legacy macOS Keychain entry remain supported. Never read another user's profile, follow a profile or credential-ancestor symlink, expose a credential, or silently replace one profile's producer identity. The reports API authenticates the token and derives the producer identity. The renderer automatically uses `https://reports.quickstark.com/api/v1/readouts`, identifies the Codex harness, and derives the project from the skill's actual working directory, using its Git origin when available or a safely fingerprinted local workspace when no remote exists. Do not configure project names, owners, producer identifiers, or harness metadata for ordinary skill runs. Token authentication, not GitHub ownership, authorizes publication; never mislabel a report as a different project or expose an absolute local path. The ordinary render command writes an immutable local report, publishes the structured result without starting a private-IP viewer, and returns the hosted reports URL only after authenticated delivery succeeds. Explicit local, LAN, or SSH viewer requests remain private. Never commit, print, reuse across security boundaries, or embed a bearer token in a report. If the private token, safe current-project identity, or hosted delivery is unavailable, preserve the local report and report the actual failure.
Include an optional `observation` only for directly observed Codex or provider measurements. A clearly identified `skill-run` may display its actual model, reasoning effort, final-response token counts, and active duration in the compact Skill run metrics section immediately after Top next prompts. Display unavailable values as `Not captured`; never estimate usage, promote a suggested configuration into a measurement, or attribute thread-turn or cumulative telemetry to an individual skill. An unrun preview never displays skill-run metrics.

The render command automatically starts or reuses a verified readout viewer, selects an available port, and writes a uniquely named, self-contained HTML file. Every promoted skill selects its own compact, purpose-specific report profile; accessible concept maps, evidence charts, review matrices, and check summaries visualize only actual recorded results. OS temporary `quickstark-readouts` storage remains the default. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into the durable, project-organized report library; verified Git identities automatically group immutable reports by project, year, and month. Its full-height, project-first Project Workbench integrates verified project navigation, searchable actual skill runs, and complete immutable readouts in one responsive page. On macOS or a graphical desktop the private viewer uses localhost. On a headless or SSH-connected Linux dev box it detects the private home-network IP, binds only to that address, protects the viewer with an unguessable URL, and returns a clickable report for a laptop on the same home network. Tailscale is not required. Set `QS_READOUT_ACCESS=ssh` to keep a remote viewer on localhost for explicit SSH forwarding, or `QS_READOUT_ACCESS=local` for local-only access.

The renderer automatically captures the actual execution machine and platform for every real skill run. Add `execution.deployments` only for directly observed environments, deployment states, and safe verified HTTP(S) URLs. Add `execution.files` only for repository-relative files this skill actually added, modified, deleted, or renamed, with a concise accurate change summary. Preserve unrelated existing work; never infer run-owned files from an already dirty worktree or expose secrets, `.env` files, credentials, absolute machine paths, or unverified deployment targets. Previews never claim an execution machine, deployment, or changed file.

When this run actually touches GitHub, a merge, or a release, add an optional `provenance` object containing only observed `pullRequests`, `closedIssues`, `release`, and `commit`. Verify GitHub numbers, record state, HTTPS links, repository ownership, release version, and complete Git hash. Set `commit.published` only after confirming remote publication; set `closedByRelease` only after independently confirming that exact release closed the issue. Omit missing evidence entirely. Record `relationships` only between observed findings, decisions, outputs, or checks; review findings may carry their actual `standards` or `specification` axis and `P0`–`P3` priority. Previews never contain delivery provenance or observed relationships.

Report the verified HTTP(S) readout URL and preserve the real HTML path. When a skill produces a standalone visual artifact, publish its primary visual with `node "<QuickStark root>/scripts/qs-skill-readout.mjs" visual --skill "<actual-skill>" --input "<absolute-path-to-visual.html>" --json`; use the returned, independently verified HTTP(S) browser URL as the primary visual link. Never present a `/tmp` filesystem path, `file:` link, or editor-opening HTML attachment as a website. Preserve the source path as secondary evidence, not as the browser destination. Record a missing runtime, denied file access, unavailable home-network route, or failed viewer health check honestly; do not bind to every network interface, claim an unreachable URL, or pretend a readout or browser visual exists.

```text
Status: Completed | Awaiting input | Blocked
Skills used: /qs-help; /another-skill only if actually used
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

Configure a project that has not used the collection before.

```text
Use $qs-setup to configure this project for the QuickStark engineering skills.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `medium`
>
> Heuristic: Project setup benefits from careful, bounded configuration checks. Never change the active model or thinking level.

Use the same fenced-prompt and muted callout format for at most two genuinely relevant alternatives.

Always include **Status**, **Skills used**, **Outcome**, **Execution**, **Readout**, and **Top next prompts**. Make each complete, copy-ready prompt the visual focus in a fenced text code block. Place **Suggested model** and **Suggested thinking** underneath in a muted blockquote callout, label both as heuristic, and never change the active model or thinking level. These suggestions are not observed run measurements, comparative benchmarks, independently verified quality, or automatic model changes. When the readout cannot be created, state `Readout: Not created —` and the actual reason. Omit deployment details, changed files, **Outputs**, **Checks**, **Commands**, **Key code**, or **Delivery** when no corresponding evidence exists. List only skills that actually ran; suggested prompts belong under **Top next prompts**, not **Skills used**. Never claim a machine, check, changed file, artifact, issue, pull request, release, URL, or result you did not verify.

Select at most three genuinely relevant, copy-ready prompt directions from:

**1. `/qs-setup`**

Configure a project that has not used the collection before.

```text
Use $qs-setup to configure this project for the QuickStark engineering skills.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `medium`
>
> Heuristic: Project setup benefits from careful, bounded configuration checks.

**2. `/qs-plan-clarify`**

Clarify requirements and durable decisions for new work.

```text
Use $qs-plan-clarify to clarify this project and document the resulting decisions.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Clarification benefits from deeper reasoning about requirements and trade-offs.

**3. `/qs-design-architecture`**

Identify and prioritize an existing codebase's refactoring opportunities.

```text
Use $qs-design-architecture to find the highest-value architecture improvements in this codebase.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `xhigh`
>
> Heuristic: Architecture analysis benefits from deeper cross-module and risk assessment.

Tailor every selected prompt to this run's actual outcome and recorded evidence; the catalog wording is a starting point, not a substitute for the accomplished work. Explain why the prompt advances the actual remaining work. If the request is finished, say `Top next prompts: None — the requested work is complete.` If input or approval is required, name the decision and do not imply that a suggested skill has already run.
