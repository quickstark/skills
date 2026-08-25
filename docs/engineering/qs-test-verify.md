# QS Test: Verify

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-specialists@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-test-verify/SKILL.md)

## What it does

`/qs-test-verify` run and report selected software verification. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/engineering/qs-test-verify/SKILL.md).

## When to reach for it

Use `/qs-test-verify` when the requested primary outcome is: run and report the selected test suites and environments without changing the software. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 170 in the specialist projection and is installed through `qs-specialists`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-test-verify` produces one normalized root result directly in chat. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

A result emits at most one copy-ready next-work prompt when a distinct actionable item remains. A complete result with no verified remaining work emits none. Public skills are never executed automatically. Brief output shows the decision-grade result and optional prompt; full output adds supporting evidence without adding prompts.

Eligible normal routes are `/qs-git-merge`, `/qs-code-debug`, `/qs-review-code`. Failure routes are `/qs-code-debug`, `/qs-review-code`, `/qs-flow-handoff`. Select at most one route that owns verified unfinished work.

The result links every verified governing specification and summarizes verified done, pending, and blocked work from those specs or their tracker. It outlines up to three exact linked work items with state and next action. If no governing specification can be located, it says so instead of inventing a link or backlog.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
