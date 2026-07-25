Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-spec)

## What it does

`qs-plan-spec` turns the current conversation and your codebase understanding into a spec (you may know this document as a PRD), then publishes it to your issue tracker.

It does **not** interview you again. By the time you reach for it, the alignment work is done — `qs-plan-spec` synthesises what is already known rather than asking a fresh round of questions.

## When to reach for it

You invoke this by typing `/qs-plan-spec` — the agent won't reach for it on its own.

Reach for it once a change has been talked through and the domain language is settled, and you want that shared understanding written down before any code is written. If you *haven't* aligned yet, grill first — for that, use [qs-plan-clarify](https://aihero.dev/skills-grill-with-docs). To split the finished spec into tickets, use [qs-plan-tickets](https://aihero.dev/skills-to-tickets).

## Prerequisites

`qs-plan-spec` publishes into your issue tracker, so [qs-setup](https://aihero.dev/skills-setup-matt-pocock-skills) must have configured the tracker and triage labels for this repo first. It applies the `ready-for-agent` label itself — no separate triage pass needed.

## What the spec includes

- **Problem statement** — what is broken or missing, and why it's worth solving, in the project's own vocabulary.
- **Solution** — the shape of the fix at a high level, before any implementation detail.
- **User stories** — an extensive, numbered list of the concrete behaviours the change must support, each one independently checkable.
- **Implementation decisions** — the choices already settled during the conversation, so they aren't relitigated later.
- **Testing decisions** — the seams the feature will be tested at, and what "done" looks like.
- **Out-of-scope items** — what this change deliberately does *not* cover, to keep the ticket bounded.
- **Further notes** — anything else worth carrying forward that doesn't fit the sections above.

## Deep modules

Before writing the spec, `qs-plan-spec` sketches the **seams** at which the feature will be tested and looks for **deep module** opportunities — a lot of functionality hidden behind a small, stable interface. It prefers existing seams to new ones and the highest seam possible, ideally just one across the whole change.

That matters for agentic development: a good interface gives tests something durable to target, so the code underneath can change without the tests moving.

## It's working if

- It starts writing the spec instead of asking you a fresh round of questions.
- It checks the seams with you before writing, and proposes as few as possible.
- The spec comes back in your project's domain vocabulary, not generic boilerplate.

## Output and next steps

`/qs-plan-spec` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, the verified viewer link and real readout path, real outputs or checks where applicable, and the best next step. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and browse verified projects, searchable reports, and actual recent activity. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

Depending on what actually happened, the next step may be:

- [`/qs-plan-tickets`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-tickets/SKILL.md) — Break a substantial specification into dependency-aware work.
- [`/qs-code-build`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-code-build/SKILL.md) — Implement a small, sufficiently clear specification directly.
- [`/qs-design-modules`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-modules/SKILL.md) — Resolve an important interface or module boundary before implementation.

## Where it fits

`qs-plan-spec` is a step in the main build chain:

```txt
grill-with-docs → to-spec → to-tickets → implement → code-review
```

Reach for it after the plan and domain language are resolved, and before you break the work into implementation tickets. Its key neighbours are [qs-plan-clarify](https://aihero.dev/skills-grill-with-docs), which sharpens the context so the spec is precise, and [qs-plan-tickets](https://aihero.dev/skills-to-tickets), which turns the spec into a set of tickets for [qs-code-build](https://aihero.dev/skills-implement) to build. When you're unsure which skill or flow fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
