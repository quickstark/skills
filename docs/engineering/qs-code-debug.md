Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/diagnosing-bugs)

## What it does

`qs-code-debug` runs a disciplined diagnosis loop for hard bugs and performance regressions — building a repro, minimising it, ranking hypotheses, instrumenting, then fixing with a regression test.

It refuses to hypothesise before you have a **tight feedback loop** — one runnable command that already goes red on *this* bug. Reading code to build a theory before that command exists is the exact failure this skill prevents. No red-capable loop, no diagnosis.

## When to reach for it

Type `/qs-code-debug`, or the agent reaches for it automatically when a task fits — it fires on "diagnose" / "debug this", or when you report something broken, throwing, failing, or slow.

Reach for it on the hard ones: the bug that resists a first glance, the intermittent flake, the regression that crept in between two known-good states. For a quick throwaway to sanity-check a design question rather than chase a defect, use [qs-design-prototype](https://aihero.dev/skills-prototype) instead.

## The tight loop is the skill

Everything else — bisection, hypothesis-testing, instrumentation — is mechanical once you have the signal. So the skill spends disproportionate effort on Phase 1: constructing a pass/fail command that drives the actual bug code path and asserts the user's exact symptom, then **tightening** it until it is fast, deterministic, and agent-runnable. A 30-second flaky loop is barely better than none; a 2-second deterministic one is a debugging superpower.

It gives you a ladder of ways to build that loop — failing test, curl script, CLI diff, headless browser, replayed trace, throwaway harness, fuzz loop, `git bisect run`, differential run — and, only as a last resort, a human-in-the-loop bash script. For non-deterministic bugs the goal isn't a clean repro but a **higher reproduction rate**: loop the trigger, parallelise, add stress until the flake is debuggable.

## It's working if

- It builds and runs a repro command *before* theorising — and pastes the invocation and its red output.
- The loop asserts the symptom you actually reported, not a nearby failure.
- Hypotheses arrive as a ranked, falsifiable list shown to you before any are tested.
- Debug instrumentation is tagged (`[DEBUG-...]`) and grepped away before it declares done.

## Output and next steps

`/qs-code-debug` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and the best next step. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and browse verified projects, searchable reports, and actual recent activity. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

Depending on what actually happened, the next step may be:

- [`/qs-test-tdd`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-test-tdd/SKILL.md) — Lock the diagnosed failure down with a regression test.
- [`/qs-review-code`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-review-code/SKILL.md) — Review the fix for correctness and unintended regressions.
- [`/qs-design-architecture`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-architecture/SKILL.md) — Investigate architectural friction that caused the recurring failure.

## Where it fits

`qs-code-debug` is a reach-for-it-anytime standalone — you drop into it the moment something is broken, and drop out once the fix and its regression test are in. Its post-mortem hands off to [qs-design-architecture](https://aihero.dev/skills-improve-codebase-architecture) when the real finding is that there's no good seam to lock the bug down — the code, not the bug, is the problem. When you're unsure which skill fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
