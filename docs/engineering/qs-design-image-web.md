# QS Design Image Web

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-frontend@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-image-web/SKILL.md)

## What it does

`/qs-design-image-web` create web design images or reusable design prompts. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/engineering/qs-design-image-web/SKILL.md).

## When to reach for it

Use `/qs-design-image-web` when the requested primary outcome is: create the requested web design images or prompt-only output. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 20 in the optional projection and is installed through `qs-frontend`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-design-image-web` produces one normalized root result directly in chat. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

A result emits at most one copy-ready next-work prompt when a distinct actionable item remains. A complete result with no verified remaining work emits none. Public skills are never executed automatically. Brief output shows the decision-grade result and optional prompt; full output adds supporting evidence without adding prompts.

Eligible normal routes are `/qs-flow-handoff`. Failure routes are `/qs-flow-handoff`. Select at most one route that owns verified unfinished work.

The result always links every verified governing specification and presents a compact work readout with what finished and what is next. It summarizes verified done, pending, and blocked work from explicit input, available task history, repository specifications or ticket plans, and a configured tracker. It outlines up to three exact linked work items with state and next action. If no governing specification or remaining work can be located, it says so instead of inventing a link or backlog.

Every run keeps a conversation checklist and reports its current stage, estimated stage and overall completion, observed progress or waiting, and needed input at the start, transitions, blockers, resumption, completion, and roughly every sixty seconds when control returns. Overall covers the root task or, in a submitted goal workflow, the entire authorized goal. Weight estimates by remaining effort and verified milestones, explain recalibration, retain defensible estimates while waiting, and reserve 100% for verified completion. Helpers contribute evidence only to their parent without double-counting. Finish with changes, checks, and remaining work.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
