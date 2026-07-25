Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/codebase-design)

## What it does

`qs-design-modules` gives you a shared, precise vocabulary for designing **deep modules** — a lot of behaviour hidden behind a small interface, placed at a clean seam, testable through that interface.

It is a **language, not a procedure**. It doesn't restructure your code or hand you a refactor plan — it fixes the words (module, interface, depth, seam, adapter, leverage, locality) so that every design conversation and every other skill that touches design speaks the same way. Consistent language is the whole point; "component," "service," "API," and "boundary" are deliberately banned because they blur the distinctions that matter.

## When to reach for it

Type `/qs-design-modules`, or the agent reaches for it automatically when a task fits.

Reach for it when you're designing or improving a module's interface, hunting for deepening opportunities, deciding where a seam goes, or making code more testable and AI-navigable. Other skills pull it in whenever they need the deep-module vocabulary. If you want to sharpen the project's *domain* terms rather than its module design, use [qs-design-domain](https://aihero.dev/skills-domain-modeling) instead; to run a whole architecture pass over an existing codebase, use [qs-design-architecture](https://aihero.dev/skills-improve-codebase-architecture).

## Deep, not shallow

A module is **deep** when a large amount of behaviour sits behind a small interface, and **shallow** when the interface is nearly as complex as the implementation. Depth is measured as **leverage** — how much a caller (or a test) can exercise per unit of interface they have to learn. Crucially, depth is a property of the *interface*, not the implementation: a deep module can be internally composed of small, swappable parts that just never surface to callers.

Two checks do most of the work. The **deletion test**: imagine deleting the module — if complexity vanishes, it was a pass-through; if it reappears across N callers, it was earning its keep. And **one adapter means a hypothetical seam; two adapters means a real one** — don't cut a seam until something actually varies across it.

## The interface is the test surface

Callers and tests cross the same seam, so a well-placed interface gives tests something durable to aim at while the code underneath moves freely. That's why the vocabulary insists on **seam** (Feathers' term — a place you can change behaviour without editing there) over the overloaded "boundary," and why "interface" here means *every fact a caller must know*: signatures, yes, but also invariants, ordering, error modes, and performance — not just the type-level surface.

## Pulled out on purpose

`qs-design-modules` is the **single source of truth** for the deep-module vocabulary, split out as its own model-invoked skill so anything can reach it. Other skills point at it rather than restating the words: [qs-test-tdd](https://aihero.dev/skills-tdd) borrows it to place a seam before writing the test, [qs-design-architecture](https://aihero.dev/skills-improve-codebase-architecture) leans on it while restructuring existing code, and [qs-plan-spec](https://aihero.dev/skills-to-spec) speaks it when it sketches seams and deepening opportunities before writing a spec.

The point of keeping it standalone is that you can also reach for it on its own — as a **reference** for how to think about module design — without triggering the larger process any of those skills mandate. Fix the words once, in one place, and every design conversation inherits them.

## Output and next steps

`/qs-design-modules` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, the verified viewer link and real readout path, real outputs or checks where applicable, and the best next step. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator, stays in the OS temporary `quickstark-readouts` directory, and does not claim that a suggested skill has already run.

Depending on what actually happened, the next step may be:

- [`/qs-test-tdd`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-test-tdd/SKILL.md) — Protect the selected module seam with a behavior-first test.
- [`/qs-plan-spec`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-spec/SKILL.md) — Document a significant interface or refactoring decision.
- [`/qs-code-build`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-code-build/SKILL.md) — Implement the agreed module design.

## Where it fits

`qs-design-modules` is a **reach-for-it-anytime standalone** — the shared vocabulary layer under the engineering skills. Its closest neighbour is [qs-design-domain](https://aihero.dev/skills-domain-modeling), the parallel vocabulary skill for the problem domain rather than the module structure. When you're unsure which skill or flow fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
