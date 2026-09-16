# QS Deploy: Release

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-deploy-release/SKILL.md)

## What it does

`/qs-deploy-release` safely verify and run a documented deployment. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/engineering/qs-deploy-release/SKILL.md).

## When to reach for it

Use `/qs-deploy-release` when the requested primary outcome is: verify and run this project's documented release workflow. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 100 in the core projection and is installed through `qs-skills`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-deploy-release` produces one normalized root result directly in chat. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

A completed release is terminal and emits no next prompts. Public skills are never executed automatically. Brief output shows only the decision-grade result; full output adds supporting evidence.

The release command has no catalog-approved continuation.

The result always links every verified governing specification and presents a compact work readout with what finished and what is next. It summarizes verified done, pending, and blocked work from explicit input, available task history, repository specifications or ticket plans, and a configured tracker. It outlines up to three exact linked work items with state and next action. If no governing specification or remaining work can be located, it says so instead of inventing a link or backlog.

Every run keeps a conversation checklist and reports its current stage, estimated stage and overall completion, observed progress or waiting, and needed input at the start, transitions, blockers, resumption, completion, and roughly every sixty seconds when control returns. Overall covers the root task or, in a submitted goal workflow, the entire authorized goal. Weight estimates by remaining effort and verified milestones, explain recalibration, retain defensible estimates while waiting, and reserve 100% for verified completion. Helpers contribute evidence only to their parent without double-counting. Finish with changes, checks, and remaining work.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
