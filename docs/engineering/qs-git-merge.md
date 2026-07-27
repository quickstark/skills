Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/resolving-merge-conflicts)

## What it does

`qs-git-merge` works through an in-progress git merge or rebase conflict, hunk by hunk, and finishes the operation — resolved, checked, and committed.

It resolves by **intent**, not by text. Before touching a hunk it traces each side back to its **primary source** — the commit message, the PR, the original issue — to understand why the change was made, then preserves both intents where they're compatible. It never invents new behaviour to paper over a clash, and it never reaches for `--abort`: the merge always gets finished.

## When to reach for it

Type `/qs-git-merge`, or the agent reaches for it automatically when a task fits.

Reach for this when you're mid-merge or mid-rebase and git has stopped on conflicts it can't resolve itself. It's for the conflict in front of you — not for planning the merge or for debugging behaviour that broke afterwards. If the merge is done but something's now failing for reasons you can't see, use [qs-code-debug](https://aihero.dev/skills-diagnosing-bugs) instead.

## Resolving by intent

The trap in a conflict is treating it as a text problem — picking "ours" or "theirs" to make the markers go away. This skill treats it as an **intent** problem. Each side of a hunk exists because someone wanted something; the resolution has to honour both wants where it can, and where they're genuinely incompatible, pick the one that matches the merge's stated goal and note the trade-off out loud.

That's why the primary sources matter. You can't preserve an intent you haven't read, so the work starts in the history — commits, PRs, tickets — not in the diff.

## It's working if

- Each resolved hunk keeps both sides' behaviour, or names the trade-off where it couldn't.
- No new behaviour appears that wasn't on either branch.
- The project's own checks — typecheck, tests, format — are found and run green before the commit.
- The merge or rebase is carried all the way to a finished commit, never aborted.

## Output and next steps

`/qs-git-merge` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and up to three copy-ready top next prompts. Present each complete prompt prominently in its own fenced text code block and place its suggested model and suggested thinking underneath in a visually muted callout. Each prompt embeds its catalog-approved follow-on skill and builds on the actual outcome, findings, decisions, outputs, and checks rather than merely recommending a skill name. Automatically generated prompts use the Codex-native `$qs-...` skill spelling; legacy explicit `/qs-...` prompts remain valid. Only the Codex composer and its skill picker can resolve a native skill mention into a blue token; a report cannot manufacture that UI state. Model and thinking guidance are explicitly heuristic; they are not measured model performance and never change the active configuration. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and open one full-height, project-first Project Workbench with verified project navigation, searchable actual skill runs, and complete immutable readouts. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

Depending on the actual completed work, tailor one to three top next prompts from:

**1. [`/qs-test-tdd`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-test-tdd/SKILL.md)**

Verify that resolving the conflict preserved observable behavior.

```text
Use $qs-test-tdd to implement this behavior using a red-green test-driven loop.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `high`
>
> Heuristic: Test-driven work benefits from reasoning through behavior and regression seams.

**2. [`/qs-review-code`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-review-code/SKILL.md)**

Review the combined changes and the conflict resolution.

```text
Use $qs-review-code to review these changes for correctness, standards, and requirements.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Code review benefits from deeper correctness, security, and standards analysis.

**3. [`/qs-code-debug`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-code-debug/SKILL.md)**

Investigate a behavior regression introduced by the merge.

```text
Use $qs-code-debug to reproduce, diagnose, and fix this bug with a regression test.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Debugging benefits from tracing failure evidence back to its actual cause.

## Where it fits

A reach-for-it-anytime standalone: you invoke it at the moment a merge or rebase stalls, and it hands you back a clean, committed tree. Its natural neighbour is [qs-code-debug](https://aihero.dev/skills-diagnosing-bugs), because a merge that resolves cleanly but misbehaves afterwards is a diagnosis problem, not a conflict one. When you're unsure which skill fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
