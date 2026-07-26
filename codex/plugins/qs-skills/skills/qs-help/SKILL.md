---
name: qs-help
description: Identify the right QuickStark skill, explain each skill's purpose, and route new features, refactors, bugs, and releases through the correct order of operations.
---

# QS Help

Orient the user. Identify the actual situation, recommend the correct next step, and explain why it comes before the alternatives. Do not begin an implementation, review, deployment, or other skill's work merely because it appears in the map.

## Choose the right starting point

- **New project or unconfigured repository:** start with `/qs-setup`.
- **New feature in an existing codebase:** start with `/qs-plan-clarify`.
- **Idea without a codebase:** start with `/qs-plan-explore`.
- **Large, uncertain, multi-session effort:** start with `/qs-plan-roadmap`.
- **Refactoring or structural friction:** start with `/qs-design-architecture`.
- **Reproducible bug or regression:** start with `/qs-code-debug`.
- **Missing, outdated, or unverified project documentation:** start with `/qs-code-document`.
- **Incoming reports or requests:** start with `/qs-flow-triage`.
- **In-progress Git conflict:** start with `/qs-git-merge`.
- **Completed, reviewed change ready for a documented release:** start with `/qs-deploy-release`.

Recommend only the path that fits the situation. A tiny, already-understood change does not need a roadmap, a prototype, a specification, and tickets simply because those skills exist.

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
12. **Review — `/qs-review-code`.** Check requirements, correctness, regressions, documentation, and repository standards. Address findings before release.
13. **Release — `/qs-deploy-release`.** Use only the actual, documented deployment workflow. Verify prerequisites and obtain explicit approval before any production, publishing, infrastructure, migration, or other external change.

For small changes, the effective route is often `/qs-plan-clarify` → `/qs-code-build` → `/qs-test-tdd` → `/qs-review-code`. Include `/qs-deploy-release` only when the user has actually requested deployment.

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
11. **Release only when requested — `/qs-deploy-release`.** Follow the existing release process and require explicit authorization for external changes.

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
| `/qs-git-merge` | Resolve an existing Git merge or rebase conflict safely. |
| `/qs-flow-triage` | Turn incoming reports and requests into actionable work. |
| `/qs-flow-handoff` | Preserve essential work and recommendations for the next session. |
| `/qs-learn-teach` | Teach a subject through a stateful, guided learning workflow. |
| `/qs-skill-write` | Create or improve a focused and reliable agent skill. |
| `/qs-deploy-release` | Verify and run a documented release after explicit approval. |

## Context and handoffs

Keep clarification, design, specifications, and ticket breakdown in one coherent session when practical. Once tickets are ready, implement each ticket in a fresh session.

Use `/qs-flow-handoff` before crossing sessions when the next agent needs decisions, artifact paths, open questions, or recommended skills. Do not copy secrets, entire transcripts, or content that already exists in a specification, ticket, ADR, commit, or report.

Use `/compact` only when continuing the same conversation; use `/qs-flow-handoff` when a different session must continue the work.

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
Skills used: /qs-help; /another-skill only if actually used
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

- `/qs-setup` — Configure a project that has not used the collection before.
- `/qs-plan-clarify` — Clarify requirements and durable decisions for new work.
- `/qs-design-architecture` — Identify and prioritize an existing codebase's refactoring opportunities.

Explain why the recommendation advances the actual work. If the request is finished, say `Next best: None — the requested work is complete.` If input or approval is required, name the decision and do not imply that a suggested skill has already run.
