# QS Plan: Specs & Tickets

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-spec/SKILL.md) · [Upstream inspiration](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-spec)

## What it does

`/qs-plan-spec` turn agreed requirements into a spec or tickets. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/engineering/qs-plan-spec/SKILL.md).

## When to reach for it

Use `/qs-plan-spec` when the requested primary outcome is: turn the agreed requirements into an actionable specification or dependency-aware implementation tickets. Choose another root command when that would be only an intermediate technique.

## Command behavior

- The same root command can produce a specification, dependency-aware tickets, or both when requested.
- Specification-only requests do not create tickets.
- Ticket decomposition remains an internal capability of `/qs-plan-spec`; it is not another installable command.

## Where it fits

This is lifecycle position 50 in the core projection and is installed through `qs-skills`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-plan-spec` produces one normalized root result directly in chat. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

A result emits at most one copy-ready next-work prompt when a distinct actionable item remains. A complete result with no verified remaining work emits none. Public skills are never executed automatically. Brief output shows the decision-grade result and optional prompt; full output adds supporting evidence without adding prompts.

Eligible normal routes are `/qs-code-build`, `/qs-plan-clarify`, `/qs-flow-handoff`. Failure routes are `/qs-code-build`, `/qs-plan-clarify`, `/qs-flow-handoff`. Select at most one route that owns verified unfinished work.

The result links every verified governing specification and summarizes verified done, pending, and blocked work from those specs or their tracker. It outlines up to three exact linked work items with state and next action. If no governing specification can be located, it says so instead of inventing a link or backlog.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
