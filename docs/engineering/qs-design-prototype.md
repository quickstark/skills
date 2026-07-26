Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/prototype)

## What it does

`qs-design-prototype` builds a small, disposable program whose only job is to answer one design question — does this state model feel right, or what should this UI look like.

The code is **throwaway from day one**, and marked as such. It carries no tests, no error handling beyond what makes it run, no abstractions, and no persistence. The point is to learn something fast and then delete it — so the moment you start hardening it, you've stopped prototyping.

## When to reach for it

Type `/qs-design-prototype`, or the agent reaches for it automatically when a task fits.

Reach for it when you have a design question that's hard to settle on paper — a state machine with cases you can't hold in your head, or a screen you can't picture until you see a few versions side by side. If instead something already built is misbehaving and you need to find out why, use [qs-code-debug](https://aihero.dev/skills-diagnosing-bugs); prototyping explores what to build, not why the built thing is broken.

## Two branches

The question decides the shape, and there are two shapes:

- **"Does this logic / state model feel right?"** — a tiny interactive terminal app that pushes the state machine through the awkward cases, printing the full state after every action so you can watch what changes.
- **"What should this look like?"** — several radically different UI variations on one route, switchable from a floating bar, so you compare real renders instead of imagining them.

Picking the wrong branch wastes the whole prototype, so the question comes first. Both branches keep state in memory, run from one command, and surface the full state on every step.

## Keep the prototype as a primary source

A finished prototype leaves two things. The **answer** — the verdict plus the question it settled — is what you capture durably (a commit message, an ADR, an issue). The **prototype itself is a primary source** — the runnable evidence the answer came from.

The prototype doesn't belong in the main branch: no tests, no error handling, nothing to maintain. But that's not a reason to destroy it. Once the answer is captured, fold any validated decision into the real code, then capture the prototype on a throwaway branch — out of main, never merged — and leave a context pointer to it on the implementation issue. The main branch stays clean; the raw exploration stays one click away for anyone who wants to re-run it. A prototype left rotting in the main branch has outlived its purpose — a prototype captured as a primary source on a side branch hasn't.

## Output and next steps

`/qs-design-prototype` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and the best next step. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and browse verified projects, searchable reports, and actual recent activity. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

Depending on what actually happened, the next step may be:

- [`/qs-design-modules`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-modules/SKILL.md) — Turn the validated prototype into a clean module or interface design.
- [`/qs-plan-clarify`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-clarify/SKILL.md) — Confirm which prototype findings should shape the real solution.
- [`/qs-plan-spec`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-spec/SKILL.md) — Capture the selected prototype behavior before production implementation.

## Where it fits

`qs-design-prototype` is a reach-for-it-anytime standalone: you drop into it to resolve a design question, then drop back out. Its answer often feeds the next step — a validated state model or UI direction becomes settled input for [qs-plan-spec](https://aihero.dev/skills-to-spec) to write up, or an architectural decision worth recording via [qs-design-domain](https://aihero.dev/skills-domain-modeling). When you're unsure which skill or flow fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
