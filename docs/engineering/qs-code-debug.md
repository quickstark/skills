# QS Code: Debug

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-code-debug/SKILL.md) · [Upstream inspiration](https://github.com/mattpocock/skills/tree/main/skills/engineering/diagnosing-bugs)

## What it does

`/qs-code-debug` reproduce and diagnose a bug or regression. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/engineering/qs-code-debug/SKILL.md).

## When to reach for it

Use `/qs-code-debug` when the requested primary outcome is: reproduce, diagnose, and fix this bug with a regression test. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 70 in the core projection and is installed through `qs-skills`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-code-debug` produces one normalized root result directly in chat. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

Every result emits three ranked copy-ready continuations: one preferred prompt and two alternatives. Public skills are never executed automatically. Brief output shows the decision-grade result and all three prompts; full output adds supporting evidence without adding prompts.

The default ranked continuations are `/qs-review-code`, `/qs-code-build`, `/qs-flow-handoff`. Failed results instead rank `/qs-code-build`, `/qs-review-code`, `/qs-flow-handoff`.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
