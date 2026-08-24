# QS Plan: Roadmap

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-roadmap/SKILL.md) · [Upstream inspiration](https://github.com/mattpocock/skills/tree/main/skills/engineering/wayfinder)

## What it does

`/qs-plan-roadmap` map large projects into manageable decisions. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/engineering/qs-plan-roadmap/SKILL.md).

## When to reach for it

Use `/qs-plan-roadmap` when the requested primary outcome is: map this large project into a practical sequence of decisions. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 40 in the core projection and is installed through `qs-skills`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-plan-roadmap` produces one normalized root result directly in chat. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

Every result emits three ranked copy-ready continuations: one preferred prompt and two alternatives. Public skills are never executed automatically. Brief output shows the decision-grade result and all three prompts; full output adds supporting evidence without adding prompts.

The default ranked continuations are `/qs-plan-spec`, `/qs-plan-clarify`, `/qs-flow-handoff`. Failed results instead rank `/qs-plan-spec`, `/qs-plan-clarify`, `/qs-flow-handoff`.

The result links every verified governing specification and previews the remaining build from those specs or their tracker. If no governing specification can be located, it says so instead of inventing a link or backlog.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
