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

`/qs-setup` produces an architecture-quality, self-contained HTML readout and closes with the same concise report used across the collection: status, skills actually used, outcome, the real readout path or private viewer link, real outputs or checks where applicable, and the best next step. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator, stays in the OS temporary `quickstark-readouts` directory, and does not claim that a suggested skill has already run.

Depending on what actually happened, the next step may be:

- [`/qs-plan-clarify`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-clarify/SKILL.md) — Start a new feature after configuring the project.
- [`/qs-flow-triage`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-flow-triage/SKILL.md) — Sort incoming work using the newly configured tracker.
- [`/qs-design-architecture`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-architecture/SKILL.md) — Inspect an existing project before starting a refactor.

## Where it fits

`qs-setup` is a **run-once setup** — the foundation the whole engineering set stands on, not a step you repeat. Its neighbours are the skills that read what it writes: [qs-flow-triage](https://aihero.dev/skills-triage), because it applies the label vocabulary configured here, and [qs-plan-spec](https://aihero.dev/skills-to-spec) / [qs-plan-tickets](https://aihero.dev/skills-to-tickets), because they publish into the issue tracker configured here. Run it first; everything downstream assumes it has. When you're unsure which skill or flow fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
