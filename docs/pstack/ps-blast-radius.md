# PS Blast Radius

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add ps-skills@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/pstack/commands/ps-blast-radius/SKILL.md)

## What it does

`/ps-blast-radius` map the impact of one proposed change. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/pstack/commands/ps-blast-radius/SKILL.md).

## When to reach for it

Use `/ps-blast-radius` when the requested primary outcome is: map callers, contracts, data, tests, and operations affected by this proposed change. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 40 in the optional PS projection and is installed through `ps-skills`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/ps-blast-radius` produces one normalized root result directly in chat. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

A result emits at most one copy-ready next-work prompt when a distinct actionable item remains. A complete result with no verified remaining work emits none. Public skills are never executed automatically. Brief output shows the decision-grade result and optional prompt; full output adds supporting evidence without adding prompts.

Eligible normal routes are `/qs-plan-spec`, `/qs-review-code`, `/qs-flow-handoff`. Failure routes are `/qs-plan-clarify`, `/qs-flow-handoff`, `/ps-how`. Select at most one route that owns verified unfinished work.

The result links every verified governing specification and summarizes verified done, pending, and blocked work from those specs or their tracker. It outlines up to three exact linked work items with state and next action. If no governing specification can be located, it says so instead of inventing a link or backlog.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
