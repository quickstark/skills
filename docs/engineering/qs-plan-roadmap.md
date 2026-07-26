Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/wayfinder)

## What it does

`qs-plan-roadmap` takes an effort too big for one agent session — wrapped in fog, where the way from here to the goal isn't visible yet — and charts it as a **shared map** of **decision tickets** on your issue tracker, then resolves them one at a time until the way is clear. It **plans, it doesn't do**: every ticket resolves a decision — a question to settle, not a slice of a build to execute — and the map is done when nothing is left to decide before someone goes and builds the thing — so it produces decisions, not deliverables.

## When to reach for it

You invoke this by typing `/qs-plan-roadmap` — the agent won't reach for it on its own.

Reach for it when an effort is **more than one agent session can hold** and the route to its **destination** is still foggy — you can feel the shape of the work but can't yet write it down as a spec or a plan. For turning an *already-clear* thread into a spec, use [qs-plan-spec](https://aihero.dev/skills-to-spec); for slicing an already-understood plan into buildable tickets, use [qs-plan-tickets](https://aihero.dev/skills-to-tickets). Wayfinder sits upstream of both: it's what you run when there's too much fog to spec directly.

## Prerequisites

The map and its tickets live on the repo's issue tracker, so wayfinder needs the tracker wiring that [qs-setup](https://aihero.dev/skills-setup-matt-pocock-skills) lays down — it seeds a "Wayfinding operations" section describing how the map, child tickets, blocking, and frontier queries are expressed for GitHub, GitLab, or local-markdown. Absent that doc, wayfinder defaults to a local-markdown map.

## The map is an index, fog is the frontier

The **map** is a single `wayfinder:map` issue whose tickets are its child issues — one shared URL the whole team can watch. It's an **index, not a store**: each decision lives in exactly one place (its ticket), and the map only gists and links, never restates. A session loads the map at low resolution and zooms into individual tickets on demand.

Beyond the live tickets lies the **fog of war** — decisions you can tell are coming but can't yet pin down. The test for whether something is a ticket or still fog is whether you can *state the question precisely now*, not whether you can answer it. Resolving a ticket clears the fog ahead of it, **graduating** whatever's now specifiable into fresh tickets. The **frontier** is the open, unblocked, unclaimed tickets — the edge of the known — and it's what the tracker's native blocking renders visually, so you see what's takeable without opening the map. Fog only gathers *toward* the **destination**; work past it is ruled **out of scope**, closed, never graduating.

Every ticket is **HITL** (human in the loop — grilling, prototype) or **AFK** (agent alone — research); a HITL ticket only resolves through a live exchange, so the agent never answers its own questions. Research stays a real ticket — a shared blocker downstream decisions hang on — but because it's AFK, a session doesn't stop and read: it fires a `/qs-plan-research` **subagent** to burn the ticket down in parallel, keeping the frontier fast, and captures the findings on a throwaway `research/<name>` branch.

## It's working if

- Naming the **destination** is the first act — before any ticket exists — because it fixes the scope every ticket is measured against.
- One map is one `wayfinder:map` issue; tickets are its child issues, referred to by **name**, never a bare `#42`.
- A session resolves **at most one ticket** (research tickets excepted), records the answer as a resolution comment, closes the ticket, and appends a one-line pointer to *Decisions so far*.
- If the opening grill surfaces **no fog**, it stops and tells you the journey is small enough to skip the map.

## Output and next steps

`/qs-plan-roadmap` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and up to three copy-ready top next prompts. Present each complete prompt prominently in its own fenced text code block and place its suggested model and suggested thinking underneath in a visually muted callout. Each prompt embeds its catalog-approved follow-on skill and builds on the actual outcome, findings, decisions, outputs, and checks rather than merely recommending a skill name. Model and thinking guidance are explicitly heuristic; they are not measured model performance and never change the active configuration. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and browse verified projects, searchable reports, and actual recent activity. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

Depending on the actual completed work, tailor one to three top next prompts from:

**1. [`/qs-plan-research`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-research/SKILL.md)**

Answer a blocking research question identified by the roadmap.

```text
Use /qs-plan-research to research this question and capture evidence-backed findings.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Research benefits from comparing evidence, uncertainty, and primary sources.

**2. [`/qs-design-prototype`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-prototype/SKILL.md)**

Resolve a roadmap decision with a disposable prototype.

```text
Use /qs-design-prototype to build a focused prototype to answer this design question.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `high`
>
> Heuristic: A focused prototype benefits from practical implementation and design iteration.

**3. [`/qs-plan-spec`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-spec/SKILL.md)**

Convert resolved roadmap decisions into an implementation specification.

```text
Use /qs-plan-spec to turn the agreed requirements into an actionable specification.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: A specification benefits from reconciling boundaries, decisions, and requirements.

## Where it fits

`qs-plan-roadmap` is a big-idea **on-ramp**: an effort too large and foggy to spec in one sitting generates a cleared map of decisions, which then merges onto the main build flow. When the fog is pushed back and the way is clear, hand off to [qs-plan-spec](https://aihero.dev/skills-to-spec) to schedule the multi-session build (or, if the effort turned out small, implement directly). It leans on [qs-plan-interview](https://aihero.dev/skills-grilling) and [qs-design-domain](https://aihero.dev/skills-domain-modeling) to resolve individual tickets, and on [qs-design-prototype](https://aihero.dev/skills-prototype) and [qs-plan-research](https://aihero.dev/skills-research) for the ticket types that need them. When you're unsure which skill or flow fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
