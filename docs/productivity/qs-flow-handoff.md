# QS Flow: Handoff

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/productivity/qs-flow-handoff/SKILL.md) · [Upstream inspiration](https://github.com/mattpocock/skills/tree/main/skills/productivity/handoff)

## What it does

`/qs-flow-handoff` prepare a concise handoff for another session. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/productivity/qs-flow-handoff/SKILL.md).

## When to reach for it

Use `/qs-flow-handoff` when the requested primary outcome is: prepare a concise handoff so another session can continue this work. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 120 in the core projection and is installed through `qs-skills`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-flow-handoff` produces one normalized root result directly in chat. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

A result emits at most one copy-ready next-work prompt when a distinct actionable item remains. A complete result with no verified remaining work emits none. Public skills are never executed automatically. Brief output shows the decision-grade result and optional prompt; full output adds supporting evidence without adding prompts.

Eligible normal routes are `/qs-help`, `/qs-code-build`, `/qs-plan-clarify`. Failure routes are `/qs-help`, `/qs-code-build`, `/qs-plan-clarify`. Select at most one route that owns verified unfinished work.

The result always links every verified governing specification and presents a compact work readout with what finished and what is next. It summarizes verified done, pending, and blocked work from explicit input, available task history, repository specifications or ticket plans, and a configured tracker. It outlines up to three exact linked work items with state and next action. If no governing specification or remaining work can be located, it says so instead of inventing a link or backlog.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
