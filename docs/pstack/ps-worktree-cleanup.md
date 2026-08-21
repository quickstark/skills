# PS Worktree Cleanup

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add ps-skills@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/pstack/commands/ps-worktree-cleanup/SKILL.md)

## What it does

`/ps-worktree-cleanup` audit and remove confirmed worktrees. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/pstack/commands/ps-worktree-cleanup/SKILL.md).

## When to reach for it

Use `/ps-worktree-cleanup` when the requested primary outcome is: audit reclaimable worktrees and remove only explicitly confirmed exact targets. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 130 in the optional PS projection and is installed through `ps-skills`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/ps-worktree-cleanup` produces one normalized root result directly in chat. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

Every result emits three ranked copy-ready continuations: one preferred prompt and two alternatives. Public skills are never executed automatically. Brief output shows the decision-grade result and all three prompts; full output adds supporting evidence without adding prompts.

The default ranked continuations are `/qs-flow-handoff`, `/qs-setup`, `/ps-help`. Failed results instead rank `/qs-flow-handoff`, `/ps-help`, `/qs-setup`.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
