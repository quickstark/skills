Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/setup-matt-pocock-skills)

## What it does

`qs-setup` teaches one repo how the engineering skills should behave in it — where issues live, what the triage labels are called, and where the domain docs sit — and records those answers as **config** the other skills read.

It writes config, it does not hard-code behaviour. The engineering chain assumes three files under `docs/agents/` exist; this skill is the one-time bootstrap that produces them, discovered from your actual repo (`git remote`, existing labels, existing `CONTEXT.md`) and confirmed with you rather than guessed. It is prompt-driven — explore, present what it found, confirm, then write — not a deterministic scaffold.

## When to reach for it

You invoke this by typing `/qs-setup` — the agent won't reach for it on its own.

Reach for it **once per repo, before the first use of any other engineering skill**. If [qs-flow-triage](https://aihero.dev/skills-triage), [qs-plan-spec](https://aihero.dev/skills-to-spec), or [qs-plan-tickets](https://aihero.dev/skills-to-tickets) start guessing where your issues live or applying labels that don't exist, they haven't been set up here yet. Re-run it only to switch issue trackers or start over — day-to-day tweaks are just edits to `docs/agents/*.md`.

## The three decisions

It leads each with a recommended answer you can accept in a word, and skips whatever it can already infer — so most runs are a couple of quick confirmations:

- **Issue tracker** — where work is tracked, so `qs-flow-triage`/`qs-plan-spec`/`qs-plan-tickets` know whether to call `gh`, `glab`, write markdown under `.scratch/`, or follow a workflow you describe. GitHub, GitLab, local markdown, or other. (It proposes the one that matches your `git remote`.)
- **Triage labels** — asked only if the `qs-flow-triage` skill is installed, and then just: keep the default labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`)? Say no only if your tracker already uses other names, so `qs-flow-triage` applies real ones instead of creating duplicates.
- **Domain docs** — assumed single-context (one `CONTEXT.md` + `docs/adr/` at the root), which fits almost every repo; it only raises a multi-context map when it spots monorepo signals.

The output is a set of files under `docs/agents/` — `issue-tracker.md`, `domain.md`, and `triage-labels.md` when `qs-flow-triage` is installed — plus an `## Agent skills` block pointing to them in whichever of `CLAUDE.md` / `AGENTS.md` the repo already uses. Those files are the shared substrate the rest of the toolkit stands on.

## It's working if

- `issue-tracker.md` and `domain.md` land under `docs/agents/` (plus `triage-labels.md` when `qs-flow-triage` is installed), and an `## Agent skills` section appears in your `CLAUDE.md` or `AGENTS.md`.
- The tracker it proposes matches your real `git remote`, and the labels match strings that already exist in your repo.
- Afterwards, `qs-flow-triage` and `qs-plan-tickets` act on the right place with the right labels instead of asking or guessing.

## Output and next steps

`/qs-setup` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and up to three copy-ready top next prompts. Present each complete prompt prominently in its own fenced text code block and place its suggested model and suggested thinking underneath in a visually muted callout. Each prompt embeds its catalog-approved follow-on skill and builds on the actual outcome, findings, decisions, outputs, and checks rather than merely recommending a skill name. Automatically generated prompts use the Codex-native `$qs-...` skill spelling; legacy explicit `/qs-...` prompts remain valid. Only the Codex composer and its skill picker can resolve a native skill mention into a blue token; a report cannot manufacture that UI state. Model and thinking guidance are explicitly heuristic; they are not measured model performance and never change the active configuration. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and open one full-height, project-first Project Workbench with verified project navigation, searchable actual skill runs, and complete immutable readouts. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

To automatically publish actual skill reports from Linux, macOS, or Windows, `QS_READOUT_PRODUCER_TOKEN` remains the only required setting when no owner-only profile credential is installed. Linux and Windows preserve valid explicit-token precedence. On macOS the renderer first selects the current `.codex` or `.codex-demo` profile's private file or named Keychain token so a shared desktop environment cannot replace that profile's producer; the valid explicit token remains supported when neither profile credential exists. A safely installed machine token and the legacy macOS Keychain entry remain supported. Reject user-home escapes and symbolic links in every profile or credential ancestor. The reporting API derives the producer identity, while the skill automatically identifies the Codex harness and the project from its current working directory. Use the Git origin when available; otherwise derive a safe, stable local-workspace identity without revealing the absolute filesystem path. The default reports endpoint is `https://reports.quickstark.com/api/v1/readouts`; ordinary runs require no project list, owner pattern, producer identifier, harness setting, GitHub verification, Git remote, or private-IP viewer. Generate the immutable local report first and present the hosted `https://reports.quickstark.com/` report URL only after authenticated acceptance. Explicit local, LAN, or SSH viewers remain available. Never expose the private token, mislabel another project, accept unsafe project paths, or claim that a failed submission succeeded.
A completed report displays a compact Skill run metrics section near the top, immediately after Top next prompts. It shows actual skill-attributed model, reasoning effort, provider-reported input and output tokens, total tokens, and active duration only when the running harness or provider genuinely captured them. Show `Not captured` for unavailable values, preserve thread-level evidence under its actual scope, and never invent measurements or attach skill-run metrics to a catalog preview.

When this skill leaves a genuine user action, its readout may include `commands` containing the exact terminal command, a clear title, and a `detail` explaining why or when the user should run it. When actual source deserves attention, its readout may include `keyCode` containing the exact code, language, and optional safe repository-relative file path. Both appear as separate, copyable code blocks. Execution logs and already executed commands are not user instructions; omit both sections when they are not applicable. Never include secrets, credentials, tokens, private keys, invented code, or speculative terminal instructions.

Depending on the actual completed work, tailor one to three top next prompts from:

**1. [`/qs-plan-clarify`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-clarify/SKILL.md)**

Start a new feature after configuring the project.

```text
Use $qs-plan-clarify to clarify this project and document the resulting decisions.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Clarification benefits from deeper reasoning about requirements and trade-offs.

**2. [`/qs-flow-triage`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-flow-triage/SKILL.md)**

Sort incoming work using the newly configured tracker.

```text
Use $qs-flow-triage to triage these incoming issues into clear, actionable work.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `medium`
>
> Heuristic: Issue triage usually benefits from focused categorization and prioritization.

**3. [`/qs-design-architecture`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-architecture/SKILL.md)**

Inspect an existing project before starting a refactor.

```text
Use $qs-design-architecture to find the highest-value architecture improvements in this codebase.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `xhigh`
>
> Heuristic: Architecture analysis benefits from deeper cross-module and risk assessment.

## Where it fits

`qs-setup` is a **run-once setup** — the foundation the whole engineering set stands on, not a step you repeat. Its neighbours are the skills that read what it writes: [qs-flow-triage](https://aihero.dev/skills-triage), because it applies the label vocabulary configured here, and [qs-plan-spec](https://aihero.dev/skills-to-spec) / [qs-plan-tickets](https://aihero.dev/skills-to-tickets), because they publish into the issue tracker configured here. Run it first; everything downstream assumes it has. When you're unsure which skill or flow fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
