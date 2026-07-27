---
name: qs-setup
description: Configure this repo for the engineering skills — set up its issue tracker, triage label vocabulary, and domain doc layout. Run once before first use of the other engineering skills.
---

# QS Setup

Scaffold the per-repo configuration that the engineering skills assume:

- **Issue tracker** — where issues live (GitHub by default; local markdown is also supported out of the box)
- **Triage labels** — the strings used for the five canonical triage roles
- **Domain docs** — where `CONTEXT.md` and ADRs live, and the consumer rules for reading them

This is a prompt-driven skill, not a deterministic script. Explore, present what you found, confirm with the user, then write.

## Process

### 1. Explore

Look at the current repo to understand its starting state. Read whatever exists; don't assume:

- `git remote -v` and `.git/config` — is this a GitHub repo? Which one?
- `AGENTS.md` and `CLAUDE.md` at the repo root — does either exist? Is there already an `## Agent skills` section in either?
- `CONTEXT.md` and `CONTEXT-MAP.md` at the repo root
- `docs/adr/` and any `src/*/docs/adr/` directories
- `docs/agents/` — does this skill's prior output already exist?
- `.scratch/` — sign that a local-markdown issue tracker convention is already in use
- Is the `qs-flow-triage` skill installed? (a `qs-flow-triage` skill folder alongside this one, or `qs-flow-triage` in your available skills.) This decides whether Section B runs at all.
- Monorepo signals — a `pnpm-workspace.yaml`, a `workspaces` field in `package.json`, or a populated `packages/*` with its own `src/`. Present only in a genuinely large multi-package repo; their absence means single-context, which is almost every repo.

### 2. Present findings and ask

Summarise what's present and what's missing. Then take the sections in order — one section, one answer, then the next.

Lead each section with the recommended answer so the user can accept it in a word. Give a one-line explainer only when the choice genuinely branches; skip the section entirely when exploration already settled it (Section B when `qs-flow-triage` isn't installed, Section C when there's no monorepo).

**Section A — Issue tracker.**

> Explainer: The "issue tracker" is where issues live for this repo. Skills like `qs-plan-tickets`, `qs-flow-triage`, `qs-plan-spec`, and `qa` read from and write to it — they need to know whether to call `gh issue create`, write a markdown file under `.scratch/`, or follow some other workflow you describe. Pick the place you actually track work for this repo.

Default posture: these skills were designed for GitHub. If a `git remote` points at GitHub, propose that. If a `git remote` points at GitLab (`gitlab.com` or a self-hosted host), propose GitLab. Otherwise (or if the user prefers), offer:

- **GitHub** — issues live in the repo's GitHub Issues (uses the `gh` CLI)
- **GitLab** — issues live in the repo's GitLab Issues (uses the [`glab`](https://gitlab.com/gitlab-org/cli) CLI)
- **Local markdown** — issues live as files under `.scratch/<feature>/` in this repo (good for solo projects or repos without a remote)
- **Other** (Jira, Linear, etc.) — ask the user to describe the workflow in one paragraph; the skill will record it as freeform prose

Record the choice in `docs/agents/issue-tracker.md`. The GitHub and GitLab templates carry a "PRs as a request surface" flag, defaulted **off** — leave it off and don't raise it; a user who wants external PRs in the triage queue can flip the flag in the file later.

**Section B — Triage label vocabulary.** Skip this section entirely if the `qs-flow-triage` skill isn't installed (exploration told you) — an uninstalled skill needs no labels.

If it is installed, ask exactly one question:

> Do you want to keep the default triage labels? (recommended: **yes**)

The defaults are the five canonical roles, each label string equal to its name: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. On **yes**, write them as-is. Only if the user says no — usually because their tracker already uses other names (e.g. `bug:triage` for `needs-triage`) — collect the overrides so `qs-flow-triage` applies existing labels instead of creating duplicates.

**Section C — Domain docs.** Default to **single-context** — one `CONTEXT.md` + `docs/adr/` at the repo root. This fits almost every repo; write it without asking.

Offer **multi-context** — a root `CONTEXT-MAP.md` pointing to per-context `CONTEXT.md` files — only when exploration found monorepo signals. Then confirm which layout they want.

### 3. Confirm and edit

Show the user a draft of:

- The `## Agent skills` block to add to whichever of `CLAUDE.md` / `AGENTS.md` is being edited (see step 4 for selection rules)
- The contents of `docs/agents/issue-tracker.md`, `docs/agents/domain.md`, and `docs/agents/triage-labels.md` (the last only when `qs-flow-triage` is installed)

Let them edit before writing.

### 4. Write

**Pick the file to edit:**

- If `CLAUDE.md` exists, edit it.
- Else if `AGENTS.md` exists, edit it.
- If neither exists, ask the user which one to create — don't pick for them.

Never create `AGENTS.md` when `CLAUDE.md` already exists (or vice versa) — always edit the one that's already there.

If an `## Agent skills` block already exists in the chosen file, update its contents in-place rather than appending a duplicate. Don't overwrite user edits to the surrounding sections.

The block:

```markdown
## Agent skills

### Issue tracker

[one-line summary of where issues are tracked]. See `docs/agents/issue-tracker.md`.

### Triage labels

[one-line summary of the label vocabulary]. See `docs/agents/triage-labels.md`.

### Domain docs

[one-line summary of layout — "single-context" or "multi-context"]. See `docs/agents/domain.md`.
```

Include the `### Triage labels` sub-block, and write `docs/agents/triage-labels.md`, only when `qs-flow-triage` is installed and Section B ran. When it isn't, both are omitted.

Then write the docs files using the seed templates in this skill folder as a starting point:

- [issue-tracker-github.md](./issue-tracker-github.md) — GitHub issue tracker
- [issue-tracker-gitlab.md](./issue-tracker-gitlab.md) — GitLab issue tracker
- [issue-tracker-local.md](./issue-tracker-local.md) — local-markdown issue tracker
- [triage-labels.md](./triage-labels.md) — label mapping (only if `qs-flow-triage` is installed)
- [domain.md](./domain.md) — domain doc consumer rules + layout

For "other" issue trackers, write `docs/agents/issue-tracker.md` from scratch using the user's description.

### 5. Done

Tell the user the setup is complete and which engineering skills will now read from these files. Mention they can edit `docs/agents/*.md` directly later — re-running this skill is only necessary if they want to switch issue trackers or restart from scratch.

## Completion report and next steps

Finish every invocation with an architecture-quality, self-contained HTML readout and a concise in-chat completion report. Resolve the QuickStark root by walking upward from this skill's `SKILL.md`; both the canonical repository and installed Codex plugin contain `scripts/qs-skill-readout.mjs`.

Write a small JSON input containing the actual skill, status, outcome, findings, decisions, real outputs, checks actually performed, and up to three relevant `nextSkills` objects containing `name`, `reason`, and a copy-ready `prompt`. Each prompt explicitly invokes its catalog-approved skill and carries forward the actual outcome, findings, decisions, outputs, and checks relevant to that follow-on. Use the Codex-native `$qs-...` skill spelling for automatically generated follow-on prompts; existing explicit `/qs-...` prompts remain supported. A resolved blue skill mention is controlled by the Codex composer and its skill picker, not by HTML, Markdown, clipboard text, or the readout viewer. Present each full prompt in its own fenced text code block. Put its suggested model and thinking level in a visually muted callout underneath. Optionally supply `model`, `thinking`, and `modelReason` when the actual remaining work justifies a more specific heuristic suggestion. Record only directly verified execution context, delivery provenance, or relationships. Generate the readout with:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --input "<absolute-path-to-readout.json>"
```

The render command automatically starts or reuses a verified readout viewer, selects an available port, and writes a uniquely named, self-contained HTML file. Every promoted skill selects its own compact, purpose-specific report profile; accessible concept maps, evidence charts, review matrices, and check summaries visualize only actual recorded results. OS temporary `quickstark-readouts` storage remains the default. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into the durable, project-organized report library; verified Git identities automatically group immutable reports by project, year, and month. Its full-height, project-first Project Workbench integrates verified project navigation, searchable actual skill runs, and complete immutable readouts in one responsive page. On macOS or a graphical desktop the private viewer uses localhost. On a headless or SSH-connected Linux dev box it detects the private home-network IP, binds only to that address, protects the viewer with an unguessable URL, and returns a clickable report for a laptop on the same home network. Tailscale is not required. Set `QS_READOUT_ACCESS=ssh` to keep a remote viewer on localhost for explicit SSH forwarding, or `QS_READOUT_ACCESS=local` for local-only access.

The renderer automatically captures the actual execution machine and platform for every real skill run. Add `execution.deployments` only for directly observed environments, deployment states, and safe verified HTTP(S) URLs. Add `execution.files` only for repository-relative files this skill actually added, modified, deleted, or renamed, with a concise accurate change summary. Preserve unrelated existing work; never infer run-owned files from an already dirty worktree or expose secrets, `.env` files, credentials, absolute machine paths, or unverified deployment targets. Previews never claim an execution machine, deployment, or changed file.

When this run actually touches GitHub, a merge, or a release, add an optional `provenance` object containing only observed `pullRequests`, `closedIssues`, `release`, and `commit`. Verify GitHub numbers, record state, HTTPS links, repository ownership, release version, and complete Git hash. Set `commit.published` only after confirming remote publication; set `closedByRelease` only after independently confirming that exact release closed the issue. Omit missing evidence entirely. Record `relationships` only between observed findings, decisions, outputs, or checks; review findings may carry their actual `standards` or `specification` axis and `P0`–`P3` priority. Previews never contain delivery provenance or observed relationships.

Report the verified HTTP(S) readout URL and preserve the real HTML path. Preserve and link the skill's primary artifact when it produces one. Record a missing runtime, denied file access, unavailable home-network route, or failed viewer health check honestly; do not bind to every network interface, claim an unreachable URL, or pretend a readout exists.

```text
Status: Completed | Awaiting input | Blocked
Skills used: /qs-setup; /another-skill only if actually used
Outcome: What was completed, discovered, decided, or is blocking progress.
Execution: Actual machine, with verified deployment and changed files when applicable.
Readout: Real absolute HTML path or verified private viewer URL.
Outputs: Real files, reports, decisions, or changes, when applicable.
Checks: Only the tests, validations, or observations actually performed.
Delivery: Verified PRs, closed issues, release, or commit, only when applicable.
```

**Top next prompts:**

**1. Recommended continuation**

Start a new feature after configuring the project.

```text
Use $qs-plan-clarify to clarify this project and document the resulting decisions.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Clarification benefits from deeper reasoning about requirements and trade-offs. Never change the active model or thinking level.

Use the same fenced-prompt and muted callout format for at most two genuinely relevant alternatives.

Always include **Status**, **Skills used**, **Outcome**, **Execution**, **Readout**, and **Top next prompts**. Make each complete, copy-ready prompt the visual focus in a fenced text code block. Place **Suggested model** and **Suggested thinking** underneath in a muted blockquote callout, label both as heuristic, and never change the active model or thinking level. These suggestions are not observed run measurements, comparative benchmarks, independently verified quality, or automatic model changes. When the readout cannot be created, state `Readout: Not created —` and the actual reason. Omit deployment details, changed files, **Outputs**, **Checks**, or **Delivery** when no corresponding evidence exists. List only skills that actually ran; suggested prompts belong under **Top next prompts**, not **Skills used**. Never claim a machine, check, changed file, artifact, issue, pull request, release, URL, or result you did not verify.

Select at most three genuinely relevant, copy-ready prompt directions from:

**1. `/qs-plan-clarify`**

Start a new feature after configuring the project.

```text
Use $qs-plan-clarify to clarify this project and document the resulting decisions.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Clarification benefits from deeper reasoning about requirements and trade-offs.

**2. `/qs-flow-triage`**

Sort incoming work using the newly configured tracker.

```text
Use $qs-flow-triage to triage these incoming issues into clear, actionable work.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `medium`
>
> Heuristic: Issue triage usually benefits from focused categorization and prioritization.

**3. `/qs-design-architecture`**

Inspect an existing project before starting a refactor.

```text
Use $qs-design-architecture to find the highest-value architecture improvements in this codebase.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `xhigh`
>
> Heuristic: Architecture analysis benefits from deeper cross-module and risk assessment.

Tailor every selected prompt to this run's actual outcome and recorded evidence; the catalog wording is a starting point, not a substitute for the accomplished work. Explain why the prompt advances the actual remaining work. If the request is finished, say `Top next prompts: None — the requested work is complete.` If input or approval is required, name the decision and do not imply that a suggested skill has already run.
