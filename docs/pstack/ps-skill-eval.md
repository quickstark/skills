# PS Skill Evaluation

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add ps-skills@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/pstack/commands/ps-skill-eval/SKILL.md)

## What it does

`/ps-skill-eval` compare skill variants through blinded trials. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/pstack/commands/ps-skill-eval/SKILL.md).

## When to reach for it

Use `/ps-skill-eval` when the requested primary outcome is: compare this skill or prompt variant with its control through blinded recorded trials. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 90 in the optional PS projection and is installed through `ps-skills`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/ps-skill-eval` produces one normalized root result directly in chat. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

Every result emits three ranked copy-ready continuations: one preferred prompt and two alternatives. Public skills are never executed automatically. Brief output shows the decision-grade result and all three prompts; full output adds supporting evidence without adding prompts.

The default ranked continuations are `/qs-skill-write`, `/qs-plan-clarify`, `/qs-flow-handoff`. Failed results instead rank `/qs-plan-clarify`, `/qs-skill-write`, `/qs-flow-handoff`.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
