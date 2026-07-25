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

`/qs-git-merge` produces an architecture-quality, self-contained HTML readout and closes with the same concise report used across the collection: status, skills actually used, outcome, the real readout path or private viewer link, real outputs or checks where applicable, and the best next step. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator, stays in the OS temporary `quickstark-readouts` directory, and does not claim that a suggested skill has already run.

Depending on what actually happened, the next step may be:

- [`/qs-test-tdd`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-test-tdd/SKILL.md) — Verify that resolving the conflict preserved observable behavior.
- [`/qs-review-code`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-review-code/SKILL.md) — Review the combined changes and the conflict resolution.
- [`/qs-code-debug`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-code-debug/SKILL.md) — Investigate a behavior regression introduced by the merge.

## Where it fits

A reach-for-it-anytime standalone: you invoke it at the moment a merge or rebase stalls, and it hands you back a clean, committed tree. Its natural neighbour is [qs-code-debug](https://aihero.dev/skills-diagnosing-bugs), because a merge that resolves cleanly but misbehaves afterwards is a diagnosis problem, not a conflict one. When you're unsure which skill fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
