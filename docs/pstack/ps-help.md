# PS Help

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add ps-skills@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/pstack/commands/ps-help/SKILL.md)

## What it does

`/ps-help` choose the right PS or QS workflow. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/pstack/commands/ps-help/SKILL.md).

## When to reach for it

Use `/ps-help` when the requested primary outcome is: choose the right PS or QS workflow for the requested outcome. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 10 in the optional PS projection and is installed through `ps-skills`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/ps-help` produces one normalized root result directly in chat. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

A result emits at most one copy-ready next-work prompt when a distinct actionable item remains. A complete result with no verified remaining work emits none. Public skills are never executed automatically. Brief output shows the decision-grade result and optional prompt; full output adds supporting evidence without adding prompts.

Eligible normal routes are `/ps-how`, `/ps-why`, `/qs-plan-clarify`. Failure routes are `/qs-plan-clarify`, `/qs-flow-handoff`, `/ps-how`. Select at most one route that owns verified unfinished work.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
