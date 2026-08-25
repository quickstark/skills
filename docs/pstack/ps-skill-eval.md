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

A result emits at most one copy-ready next-work prompt when a distinct actionable item remains. A complete result with no verified remaining work emits none. Public skills are never executed automatically. Brief output shows the decision-grade result and optional prompt; full output adds supporting evidence without adding prompts.

Eligible normal routes are `/qs-skill-write`, `/qs-plan-clarify`, `/qs-flow-handoff`. Failure routes are `/qs-plan-clarify`, `/qs-skill-write`, `/qs-flow-handoff`. Select at most one route that owns verified unfinished work.

The result links every verified governing specification and summarizes verified done, pending, and blocked work from those specs or their tracker. It outlines up to three exact linked work items with state and next action. If no governing specification can be located, it says so instead of inventing a link or backlog.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
