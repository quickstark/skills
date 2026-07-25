Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-tickets)

## What it does

`qs-plan-tickets` breaks a plan, spec, or the current conversation into a set of **tickets** — each a tracer-bullet vertical slice — and publishes them to your configured tracker, with every ticket declaring the tickets that block it.

Every ticket is a **tracer bullet** — a thin *vertical* slice that cuts through all integration layers end-to-end (schema, API, UI, tests), never a horizontal slice of one layer. A completed slice is demoable or verifiable on its own, which is what makes each ticket safe to hand to an agent.

## When to reach for it

You invoke this by typing `/qs-plan-tickets` — the agent won't reach for it on its own.

Reach for it once you have an agreed plan or a written spec and you want it split into tickets. Point it at the conversation, or pass a spec or issue reference and it fetches the body and comments first. If the change hasn't been written up as a spec yet, produce one first — for that, use [qs-plan-spec](https://aihero.dev/skills-to-spec).

## Prerequisites

`qs-plan-tickets` publishes into your issue tracker, so [qs-setup](https://aihero.dev/skills-setup-matt-pocock-skills) must have configured the tracker and its triage label vocabulary for this repo first. On a real tracker it applies the ready-for-agent label as it publishes.

## One artifact, two readings

The blocking edges are the whole point. They make one set of tickets read two ways, depending on the tracker:

- **Local files** → one file per ticket under `.scratch/<feature>/issues/`, numbered blockers-first, the edges written as text. You work them top-to-bottom, by hand, staying in the loop.
- **A real tracker (GitHub, Linear)** → one issue per ticket, the edges as native blocking links (or sub-issues). Any ticket whose blockers are all done is on the **frontier** and can be grabbed — so several agents can run at once.

The edges live in the ticket regardless of medium; the medium only decides whether anything acts on them in parallel. `qs-plan-tickets` produces the artifact — how you run it (sequential by hand, or a parallel fleet) is up to you.

## Vertical slices, not horizontal ones

The whole skill turns on one distinction. A **horizontal** slice ships one layer of the change — all the schema, or all the API — and nothing works until every layer lands. A **vertical** slice, the tracer bullet, ships one narrow path through *every* layer at once, so it can be demoed the moment it's done.

Before slicing, `qs-plan-tickets` looks for prefactoring — "make the change easy, then make the easy change" — and orders that work first. It then quizzes you on the breakdown (granularity, blocking edges, what to merge or split) before publishing anything, and publishes blockers first so each ticket's "Blocked by" can reference a real ticket.

## The wide-refactor exception

One shape breaks the tracer-bullet rule: a **wide refactor** — a single mechanical change (rename a column, retype a shared symbol) whose **blast radius** fans across the whole codebase, so one edit breaks thousands of call sites at once and no vertical slice can land green. `qs-plan-tickets` slices it as **expand–contract** instead: expand (add the new form beside the old so nothing breaks), migrate (move call sites over in batches sized by blast radius, one ticket per batch, CI green throughout because the old form still exists), then contract (delete the old form once no caller remains). When even the batches can't stay green alone, they share an integration branch that all block a final integrate-and-verify ticket, and green is promised only there.

## Output and next steps

`/qs-plan-tickets` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, the verified viewer link and real readout path, real outputs or checks where applicable, and the best next step. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and browse verified projects, searchable reports, and actual recent activity. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

Depending on what actually happened, the next step may be:

- [`/qs-code-build`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-code-build/SKILL.md) — Implement the next unblocked ticket.
- [`/qs-test-tdd`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-test-tdd/SKILL.md) — Establish the agreed test seam for a ticket before implementation.
- [`/qs-flow-handoff`](https://github.com/quickstark/skills/blob/main/skills/productivity/qs-flow-handoff/SKILL.md) — Transfer the next ticket and its context into a fresh session.

## Where it fits

`qs-plan-tickets` is a step in the main build chain:

```txt
grill-with-docs → to-spec → to-tickets → implement → code-review
```

It sits between [qs-plan-spec](https://aihero.dev/skills-to-spec), which hands it a settled spec with user stories to slice against, and [qs-code-build](https://aihero.dev/skills-implement), which builds each ticket, driving [qs-test-tdd](https://aihero.dev/skills-tdd) internally to write the tests test-first, before its [qs-review-code](https://aihero.dev/skills-code-review) pass. Work the frontier one ticket per fresh context, clearing between them. When you're unsure which skill or flow fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
