# QS Test: Author

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-specialists@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-test-author/SKILL.md)

## What it does

`/qs-test-author` add focused tests for existing behavior. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/engineering/qs-test-author/SKILL.md).

## When to reach for it

Use `/qs-test-author` when the requested primary outcome is: add or improve focused automated tests for this existing behavior. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 160 in the specialist projection and is installed through `qs-specialists`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-test-author` produces one normalized root result directly in chat. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

Every result emits three ranked copy-ready continuations: one preferred prompt and two alternatives. Public skills are never executed automatically. Brief output shows the decision-grade result and all three prompts; full output adds supporting evidence without adding prompts.

The default ranked continuations are `/qs-test-verify`, `/qs-review-code`, `/qs-git-merge`. Failed results instead rank `/qs-test-verify`, `/qs-review-code`, `/qs-flow-handoff`.

The result links every verified governing specification and previews the remaining build from those specs or their tracker. If no governing specification can be located, it says so instead of inventing a link or backlog.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
