Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/productivity/grilling)

## What it does

`qs-plan-interview` is the relentless interview that stress-tests a plan or design before you build it. It walks down the decision tree branch by branch, resolving the dependencies between decisions one at a time until you and the agent share the same understanding.

It asks **one question at a time** and waits for your answer before the next — never a bulk list, which is bewildering. Each question comes with the agent's own recommended answer, and any question the codebase can settle it explores instead of asking you. It won't start enacting the plan until you confirm the shared understanding has been reached.

## When to reach for it

Type `/qs-plan-interview`, or the agent reaches for it automatically when a task fits — this is the underlying primitive, not a user-only entry point.

Reach for it when a plan or design still has soft spots and you want them surfaced before code is written. In practice you usually invoke it through one of its two wrappers rather than by name: for a plain grilling session use [qs-plan-explore](https://aihero.dev/skills-grill-me); to have the session also write ADRs and a glossary as it goes, use [qs-plan-clarify](https://aihero.dev/skills-grill-with-docs).

## The decision tree

The mental model is a **decision tree**: every plan branches into decisions, and decisions depend on each other. `qs-plan-interview` descends that tree one node at a time, so an early answer can reshape which questions come next. That is why the questions arrive singly and in dependency order — a firehose of parallel questions loses the structure that makes the interview converge on a shared understanding.

## Pulled out on purpose

`qs-plan-interview` is the **single source of truth** for the interview technique, split out as a model-invoked **primitive** so every skill that needs an interview can reach it instead of reinventing one. [qs-plan-explore](https://aihero.dev/skills-grill-me) and [qs-plan-clarify](https://aihero.dev/skills-grill-with-docs) are its two user-invoked front doors, but [qs-design-architecture](https://aihero.dev/skills-improve-codebase-architecture) and [qs-flow-triage](https://aihero.dev/skills-triage) also lean on it to pressure-test their own decisions.

Keeping the technique in one place means you can also reach for it directly when you just want the interview — without the ADR-writing or ticket-shaping that its wrappers add on top.

## Output and next steps

`/qs-plan-interview` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and up to three copy-ready top next prompts. Present each complete prompt prominently in its own fenced text code block and place its suggested model and suggested thinking underneath in a visually muted callout. Each prompt embeds its catalog-approved follow-on skill and builds on the actual outcome, findings, decisions, outputs, and checks rather than merely recommending a skill name. Model and thinking guidance are explicitly heuristic; they are not measured model performance and never change the active configuration. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and browse verified projects, searchable reports, and actual recent activity. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

Depending on the actual completed work, tailor one to three top next prompts from:

**1. [`/qs-plan-clarify`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-clarify/SKILL.md)**

Turn interview answers into documented project decisions.

```text
Use /qs-plan-clarify to clarify this project and document the resulting decisions.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Clarification benefits from deeper reasoning about requirements and trade-offs.

**2. [`/qs-design-domain`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-domain/SKILL.md)**

Resolve terminology or domain concepts exposed by the interview.

```text
Use /qs-design-domain to clarify this project's domain model and shared vocabulary.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Domain modeling benefits from precise concepts, boundaries, and relationships.

**3. [`/qs-plan-spec`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-spec/SKILL.md)**

Write a specification once the outstanding decisions are settled.

```text
Use /qs-plan-spec to turn the agreed requirements into an actionable specification.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: A specification benefits from reconciling boundaries, decisions, and requirements.

## Where it fits

`qs-plan-interview` is the interview **primitive** under the main build chain: [qs-plan-clarify](https://aihero.dev/skills-grill-with-docs) runs it to sharpen context before [qs-plan-spec](https://aihero.dev/skills-to-spec) writes the spec. When you're unsure which entry point fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
