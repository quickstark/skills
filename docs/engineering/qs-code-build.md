Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/implement)

## What it does

`qs-code-build` builds the work described in a spec or a set of tickets — driving it through test-driven development, typechecking, and the full test suite, then handing off to review and committing to the current branch.

It does **not** decide what to build. The spec is already settled and the seams are already agreed; `qs-code-build` executes that plan rather than reopening it. It is the hands, not the head — the thinking happened upstream.

## When to reach for it

You invoke this by typing `/qs-code-build` — the agent won't reach for it on its own.

Reach for it once the work is written down as a spec or split into tickets and you're ready to turn that into code. If the spec doesn't exist yet, write it first — for that, use [qs-plan-spec](https://aihero.dev/skills-to-spec), or [qs-plan-tickets](https://aihero.dev/skills-to-tickets) to break a spec into tickets. If you just want to build something test-first without a full spec, drop to [qs-test-tdd](https://aihero.dev/skills-tdd) directly.

## Pre-agreed seams

The idea `qs-code-build` runs on is the **seam** — the stable interface a feature is tested at, chosen before any code is written. It doesn't invent seams mid-build; it uses the ones already picked (during [qs-plan-spec](https://aihero.dev/skills-to-spec)) and writes tests against them via [qs-test-tdd](https://aihero.dev/skills-tdd). Working at pre-agreed seams is what keeps the implementation honest: the tests target something durable, so the code underneath can move without the tests moving.

Around that core it keeps the loop tight — typecheck often, run single test files as it goes, run the whole suite once at the end — then closes out with a review pass and a commit to the current branch.

## Output and next steps

`/qs-code-build` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and up to three copy-ready top next prompts. Present each complete prompt prominently in its own fenced text code block and place its suggested model and suggested thinking underneath in a visually muted callout. Each prompt embeds its catalog-approved follow-on skill and builds on the actual outcome, findings, decisions, outputs, and checks rather than merely recommending a skill name. Automatically generated prompts use the Codex-native `$qs-...` skill spelling; legacy explicit `/qs-...` prompts remain valid. Only the Codex composer and its skill picker can resolve a native skill mention into a blue token; a report cannot manufacture that UI state. Model and thinking guidance are explicitly heuristic; they are not measured model performance and never change the active configuration. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and open one full-height, project-first Project Workbench with verified project navigation, searchable actual skill runs, and complete immutable readouts. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

Depending on the actual completed work, tailor one to three top next prompts from:

**1. [`/qs-test-tdd`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-test-tdd/SKILL.md)**

Add or complete behavior-focused coverage for the implemented change.

```text
Use $qs-test-tdd to implement this behavior using a red-green test-driven loop.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `high`
>
> Heuristic: Test-driven work benefits from reasoning through behavior and regression seams.

**2. [`/qs-review-code`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-review-code/SKILL.md)**

Review the implementation against its requirements and standards.

```text
Use $qs-review-code to review these changes for correctness, standards, and requirements.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Code review benefits from deeper correctness, security, and standards analysis.

**3. [`/qs-code-document`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-code-document/SKILL.md)**

Document the verified implementation, changed files, and operational behavior.

```text
Use $qs-code-document to write or update accurate documentation for the actual project and its verified behavior.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `medium`
>
> Heuristic: Verified documentation usually benefits from focused code-to-document comparison.

## Where it fits

`qs-code-build` is the build step near the end of the main chain, just before the review:

```txt
grill-with-docs → to-spec → to-tickets → implement → code-review
```

Reach for it after the work has been specced and sequenced, not before. Its key neighbours are [qs-plan-tickets](https://aihero.dev/skills-to-tickets), which produces the tickets — each declaring its blocking edges — that it works through, and [qs-test-tdd](https://aihero.dev/skills-tdd), which it drives internally to write the tests at each seam before running its own [qs-review-code](https://aihero.dev/skills-code-review) pass and committing. When you're unsure which skill or flow fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
