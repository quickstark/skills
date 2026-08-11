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

`/qs-deploy-release` produces one normalized root result and one authenticated hosted readout. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

A completed release is terminal and emits no next prompts. Public skills are never executed automatically. Brief reports show only the decision-grade result; full reports add supporting evidence.

The release command has no catalog-approved continuation.

The hosted and in-chat views consume the same normalized result. Ordinary runs return only an authenticated `https://reports.quickstark.com/` URL; local viewers remain explicit diagnostic tools. See [the shared skill-run contract](../skill-run-contract.md).
