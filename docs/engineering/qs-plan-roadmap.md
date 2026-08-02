# QS Plan: Roadmap

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-roadmap/SKILL.md) · [Upstream inspiration](https://github.com/mattpocock/skills/tree/main/skills/engineering/wayfinder)

## What it does

`/qs-plan-roadmap` map large projects into manageable decisions. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/engineering/qs-plan-roadmap/SKILL.md).

## When to reach for it

Use `/qs-plan-roadmap` when the requested primary outcome is: map this large project into a practical sequence of decisions. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 40 in the core projection and is installed through `qs-skills`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-plan-roadmap` produces one normalized root result and one authenticated hosted readout. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

Complete work emits no next prompt. A distinct required workflow or material user decision emits exactly one copy-ready continuation. Public skills are never executed automatically. Brief reports show only the decision-grade result; full reports add supporting evidence without adding continuations.

The catalog-approved continuation, only when the result requires it, is `/qs-plan-spec`.

The hosted and in-chat views consume the same normalized result. Ordinary runs return only an authenticated `https://reports.quickstark.com/` URL; local viewers remain explicit diagnostic tools. See [the shared skill-run contract](../skill-run-contract.md).
