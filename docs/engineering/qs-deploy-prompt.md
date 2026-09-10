# QS Deploy: Prompt

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-specialists@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-deploy-prompt/SKILL.md)

## What it does

`/qs-deploy-prompt` generate a scoped autonomous deployment prompt. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/engineering/qs-deploy-prompt/SKILL.md).

## When to reach for it

Use `/qs-deploy-prompt` when the requested primary outcome is: generate one scoped goal-mode execution prompt for planning, building, verifying, and deploying the requested feature. Choose another root command when that would be only an intermediate technique.

## Command behavior

- Produces one copy-ready prompt; generation never starts a goal or deploys anything.
- Submitting the prompt authorizes only its named operations and targets; host permissions remain in force.
- Selected workflow skills and goal tools must be available before the prompt is ready for execution.

## Where it fits

This is lifecycle position 200 in the specialist projection and is installed through `qs-specialists`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-deploy-prompt` produces one normalized root result directly in chat. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

A result emits at most one copy-ready next-work prompt when a distinct actionable item remains. A complete result with no verified remaining work emits none. Public skills are never executed automatically. Brief output shows the decision-grade result and optional prompt; full output adds supporting evidence without adding prompts.

The primary output is one goal execution prompt. Failure routes are `/qs-plan-clarify`, `/qs-flow-handoff`; missing prerequisites prevent execution-ready output.

The result always links every verified governing specification and presents a compact work readout with what finished and what is next. It summarizes verified done, pending, and blocked work from explicit input, available task history, repository specifications or ticket plans, and a configured tracker. It outlines up to three exact linked work items with state and next action. If no governing specification or remaining work can be located, it says so instead of inventing a link or backlog.

Every run keeps a conversation checklist, verifies completed stages, reports observed progress or waiting and needed input during long operations, and finishes with changes, checks, and remaining work. Helpers contribute evidence only to their parent.

Successful generation produces exactly one self-contained goal execution prompt, beginning with goal establishment before mutations. It does not start a goal or deploy. Missing material inputs prevent execution-ready output; submission authorizes only the named sequence and operations within host controls.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
