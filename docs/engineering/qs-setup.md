# QS Setup

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-setup/SKILL.md) · [Upstream inspiration](https://github.com/mattpocock/skills/tree/main/skills/engineering/setup-matt-pocock-skills)

## What it does

`/qs-setup` configure project trackers, labels, and docs. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/engineering/qs-setup/SKILL.md).

## When to reach for it

Use `/qs-setup` when the requested primary outcome is: configure this project for the QuickStark engineering skills. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 20 in the core projection and is installed through `qs-skills`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-setup` produces one normalized root result directly in chat. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

A result emits at most one copy-ready next-work prompt when a distinct actionable item remains. A complete result with no verified remaining work emits none. Public skills are never executed automatically. Brief output shows the decision-grade result and optional prompt; full output adds supporting evidence without adding prompts.

Eligible normal routes are `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-plan-roadmap`. Failure routes are `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-plan-roadmap`. Select at most one route that owns verified unfinished work.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
