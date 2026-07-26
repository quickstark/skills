Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/grill-with-docs)

## What it does

`qs-plan-clarify` interviews you relentlessly about a plan or design, one question at a time, until you and the agent reach a shared understanding — and it writes the vocabulary and decisions down as you go.

The grilling **leaves a paper trail**. A plain interview sharpens your thinking and then evaporates when the session ends; this one captures each term the moment it's resolved into a `CONTEXT.md` glossary, and records the hard, one-way decisions as ADRs. The alignment survives the conversation instead of living only in your head.

## When to reach for it

You invoke this by typing `/qs-plan-clarify` — the agent won't reach for it on its own.

Reach for it at the very start of a change, when the plan is still fuzzy and the domain language isn't settled, and you want to stress-test both before any code exists. If you only want the interview and don't need the artifacts, use [qs-plan-interview](https://aihero.dev/skills-grilling); if the plan is already clear and you just need to pin down or record terminology, use [qs-design-domain](https://aihero.dev/skills-domain-modeling). And if the change is too big to hold in one session and its route is still foggy — a greenfield project, a huge feature build — start upstream with [qs-plan-roadmap](https://aihero.dev/skills-wayfinder): it charts the effort as a map of decisions, then hands back to this main flow once the way is clear.

## Prerequisites

This skill is stateful — it writes into your repo as it grills. Resolved terms land in a `CONTEXT.md` glossary at the root (or the relevant context's `CONTEXT.md` if a `CONTEXT-MAP.md` marks a multi-context repo), and genuinely hard-to-reverse decisions land as ADRs under `docs/adr/`. Both are created lazily — nothing exists until the first term or decision crystallises — so you don't need to scaffold anything up front, but you do need to be somewhere it's safe to write these files.

## The grill

The engine is a **grill**: a relentless, one-question-at-a-time walk down the decision tree, resolving dependencies between decisions before moving on, with a recommended answer offered for every question. Questions the codebase can answer are answered by reading the codebase, not by asking you.

What makes this variant its own skill is where the answers go. As the grill runs, fuzzy language gets sharpened into canonical terms and written to the glossary inline — not batched at the end. The glossary stays a glossary: pure vocabulary, no implementation details, no spec. ADRs are offered sparingly, only when a decision is hard to reverse, surprising without context, and the result of a real trade-off. Most sessions produce a sharper glossary and few or no ADRs, and that's the intended shape.

## It's working if

- It asks one question at a time and waits, rather than dumping a questionnaire.
- Terms get written to `CONTEXT.md` the moment they resolve, in your project's own words.
- It reaches into the codebase to answer its own questions where it can.
- ADRs stay rare — you're not asked to rubber-stamp reversible choices.

## Output and next steps

`/qs-plan-clarify` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and the best next step. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and browse verified projects, searchable reports, and actual recent activity. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

Depending on what actually happened, the next step may be:

- [`/qs-plan-spec`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-spec/SKILL.md) — Record the agreed requirements as an actionable specification.
- [`/qs-plan-research`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-research/SKILL.md) — Resolve an open question that needs external or primary-source evidence.
- [`/qs-design-prototype`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-prototype/SKILL.md) — Test a design question that conversation alone cannot settle.

## Where it fits

`qs-plan-clarify` is the opening step of the main build chain:

```txt
grill-with-docs → to-spec → to-tickets → implement → code-review
```

It comes first, before anything is written down as a spec: it produces the shared understanding and settled vocabulary that [qs-plan-spec](https://aihero.dev/skills-to-spec) then synthesises into a spec without re-interviewing you. Its close neighbours are [qs-plan-interview](https://aihero.dev/skills-grilling), the same interview without the docs, and [qs-design-domain](https://aihero.dev/skills-domain-modeling), the glossary-and-ADR discipline it drives. When you're unsure which skill or flow fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
