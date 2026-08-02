# QS Code: Document

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-specialists@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-code-document/SKILL.md)

## What it does

`/qs-code-document` write accurate, verified project documentation. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/engineering/qs-code-document/SKILL.md).

## When to reach for it

Use `/qs-code-document` when the requested primary outcome is: write or update accurate documentation for the actual project and its verified behavior. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 150 in the specialist projection and is installed through `qs-specialists`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-code-document` produces one normalized root result and one authenticated hosted readout. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

Complete work emits no next prompt. A distinct required workflow or material user decision emits exactly one copy-ready continuation. Public skills are never executed automatically. Brief reports show only the decision-grade result; full reports add supporting evidence without adding continuations.

The catalog-approved continuation, only when the result requires it, is `/qs-review-code`.

The hosted and in-chat views consume the same normalized result. Ordinary runs return only an authenticated `https://reports.quickstark.com/` URL; local viewers remain explicit diagnostic tools. See [the shared skill-run contract](../skill-run-contract.md).
