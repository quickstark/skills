Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/research)

## What it does

`qs-plan-research` answers a question by reading the sources that own the answer and leaving a cited Markdown file behind. It works only from **primary sources** — official docs, source code, specs, first-party APIs — never a secondary write-up of them, so what it saves is traceable back to something authoritative rather than a summary of a summary.

## When to reach for it

Type `/qs-plan-research`, or the agent reaches for it automatically when a task turns into reading legwork.

Reach for it when the next step is *finding something out* — how an API behaves, what a spec actually says, whether a claim holds — and you'd rather not stall your own thread doing the reading. For sharpening a plan by interview instead of by reading, use [qs-plan-interview](https://aihero.dev/skills-grilling); for exploring what to build with throwaway code, use [qs-design-prototype](https://aihero.dev/skills-prototype).

## Delegated legwork

The defining move is that the reading runs as a **background agent**. You keep working; it goes off, follows each claim back to its primary source, and drops a single cited Markdown file into wherever the repo keeps such notes. Research is legwork you delegate, not thinking you outsource — you get back a document to react to, with its sources attached.

## Output and next steps

`/qs-plan-research` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, the verified viewer link and real readout path, real outputs or checks where applicable, and the best next step. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and browse verified projects, searchable reports, and actual recent activity. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

Depending on what actually happened, the next step may be:

- [`/qs-plan-clarify`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-clarify/SKILL.md) — Use the research findings to settle the remaining requirements.
- [`/qs-design-prototype`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-prototype/SKILL.md) — Test a promising research finding with a focused prototype.
- [`/qs-plan-spec`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-spec/SKILL.md) — Incorporate verified findings into an actionable specification.

## Where it fits

A reach-for-it-anytime standalone that feeds the thinking skills: the file it produces is something to grill, plan, or design against, so it sits upstream of work like [qs-plan-interview](https://aihero.dev/skills-grilling) and [to-prd](https://aihero.dev/skills-to-prd) rather than in the build chain. For the whole map, see [qs-help](https://aihero.dev/skills-ask-matt).
