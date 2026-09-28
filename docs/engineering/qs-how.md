# QS How

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-advanced@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-how/SKILL.md)

## What it does

`/qs-how` explain how a selected subsystem works. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/engineering/qs-how/SKILL.md).

## When to reach for it

Use `/qs-how` when the requested primary outcome is: explain how the selected subsystem works from code and observed interfaces. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 20 in the advanced projection and is installed through `qs-advanced`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-how` produces one normalized root result directly in chat. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

A result emits at most one copy-ready next-work prompt when a distinct actionable item remains. A complete result with no verified remaining work emits none. Public skills are never executed automatically. Brief output shows the decision-grade result and optional prompt; full output adds supporting evidence without adding prompts.

Eligible normal routes are `/qs-blast-radius`, `/qs-plan-spec`, `/qs-why`. Failure routes are `/qs-plan-clarify`, `/qs-flow-handoff`, `/qs-why`. Select at most one route that owns verified unfinished work.

Every run keeps a conversation checklist and reports its current stage, estimated stage and overall completion, observed progress or waiting, and needed input at the start, transitions, blockers, resumption, completion, and roughly every sixty seconds when control returns. Overall covers the root task or, in a submitted goal workflow, the entire authorized goal. Weight estimates by remaining effort and verified milestones, explain recalibration, retain defensible estimates while waiting, and reserve 100% for verified completion. Helpers contribute evidence only to their parent without double-counting. Finish with changes, checks, and remaining work.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
