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

`/qs-plan-interview` produces an architecture-quality, self-contained HTML readout and closes with the same concise report used across the collection: status, skills actually used, outcome, the real readout path or private viewer link, real outputs or checks where applicable, and the best next step. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator, stays in the OS temporary `quickstark-readouts` directory, and does not claim that a suggested skill has already run.

Depending on what actually happened, the next step may be:

- [`/qs-plan-clarify`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-clarify/SKILL.md) — Turn interview answers into documented project decisions.
- [`/qs-design-domain`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-domain/SKILL.md) — Resolve terminology or domain concepts exposed by the interview.
- [`/qs-plan-spec`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-spec/SKILL.md) — Write a specification once the outstanding decisions are settled.

## Where it fits

`qs-plan-interview` is the interview **primitive** under the main build chain: [qs-plan-clarify](https://aihero.dev/skills-grill-with-docs) runs it to sharpen context before [qs-plan-spec](https://aihero.dev/skills-to-spec) writes the spec. When you're unsure which entry point fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
