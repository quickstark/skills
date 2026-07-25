Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd)

## What it does

`qs-test-tdd` builds a feature or fixes a bug test-first, one behaviour at a time, driving the code out through a red-green loop.

It will **not** write all the tests up front. Batching the tests first ("horizontal slicing") produces tests of _imagined_ behaviour — they check the shape of things and go numb to real changes. `qs-test-tdd` instead takes vertical slices: one test, then just enough code to pass it, then the next test, each cycle informed by what the last one taught you. Tests target public interfaces only, so the implementation underneath can change without the tests moving.

## When to reach for it

Type `/qs-test-tdd`, or the agent reaches for it automatically when a task fits — building a feature or fixing a bug test-first, or when you say "red-green-refactor".

Reach for it when there's a concrete behaviour to build and you want tests that survive a refactor. If the behaviour isn't pinned down yet, settle the spec first — for that, use [qs-plan-spec](https://aihero.dev/skills-to-spec). When the work is really about the shape of the interface rather than the tests, use [qs-design-modules](https://aihero.dev/skills-codebase-design); `qs-test-tdd` calls into it for the deep-module vocabulary during planning.

## Red-green, one slice at a time

The leading idea is the **red-green loop**: write one failing test (red), add just enough code to pass it (green), then repeat for the next behaviour — each cycle informed by what the last one taught you. The very first cycle is a **tracer bullet**: one test that proves a single path works end-to-end, before you build outward from it. Because you just wrote the code, you know exactly which behaviour matters and how to verify it — you never outrun your headlights by committing to test structure you don't yet understand.

Two rules keep the tests honest. A good test reads like a specification ("user can checkout with valid cart") and exercises real code paths through the public API, so renaming an internal function never breaks it. And expected values come from an independent source of truth — a known-good literal, a worked example, the spec — never recomputed the way the code computes them, which is how a **tautological** test passes by construction and tells you nothing.

Refactoring only happens once the suite is green; never while red.

## It's working if

- It writes one test, gets it passing, and only then writes the next — not a batch of tests followed by a batch of code.
- The tests name behaviours, not internals, and would survive an internal rename.
- Expected values are literals from the spec, not figures derived the same way the code derives them.

## Output and next steps

`/qs-test-tdd` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, the verified viewer link and real readout path, real outputs or checks where applicable, and the best next step. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and browse verified projects, searchable reports, and actual recent activity. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

Depending on what actually happened, the next step may be:

- [`/qs-code-build`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-code-build/SKILL.md) — Implement the smallest change that makes the verified test pass.
- [`/qs-review-code`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-review-code/SKILL.md) — Review the completed behavior and the quality of its tests.
- [`/qs-design-modules`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-modules/SKILL.md) — Improve an interface when the test exposes an unhealthy seam.

## Where it fits

`qs-test-tdd` is the red-green loop the main build chain runs to write code:

```txt
grill-with-docs → to-spec → to-tickets → implement → code-review
```

[qs-code-build](https://aihero.dev/skills-implement) is the chain's build step, and it drives `qs-test-tdd` internally to build each ticket test-first before handing off to [qs-review-code](https://aihero.dev/skills-code-review) — so `qs-test-tdd` is the engine inside that step rather than a step of its own. You can also reach for it directly, whenever there's a concrete behaviour to build without a full spec. Its other neighbour is [qs-design-modules](https://aihero.dev/skills-codebase-design), which it leans on to find deep-module seams worth testing at. When you're unsure which skill or flow fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
