# QS Learn: Teach

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-specialists@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/productivity/qs-learn-teach/SKILL.md) · [Upstream inspiration](https://github.com/mattpocock/skills/tree/main/skills/productivity/teach)

## What it does

`/qs-learn-teach` learn a subject through a guided study plan. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/productivity/qs-learn-teach/SKILL.md).

## When to reach for it

Use `/qs-learn-teach` when the requested primary outcome is: teach me this subject through a practical, guided study plan. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 180 in the specialist projection and is installed through `qs-specialists`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-learn-teach` produces one normalized root result directly in chat. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

Every result emits three ranked copy-ready continuations: one preferred prompt and two alternatives. Public skills are never executed automatically. Brief output shows the decision-grade result and all three prompts; full output adds supporting evidence without adding prompts.

The default ranked continuations are `/qs-plan-research`, `/qs-design-prototype`, `/qs-skill-write`. Failed results instead rank `/qs-plan-research`, `/qs-design-prototype`, `/qs-skill-write`.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
