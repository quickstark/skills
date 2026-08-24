# QS Skill: Write

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-specialists@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/productivity/qs-skill-write/SKILL.md) · [Upstream inspiration](https://github.com/mattpocock/skills/tree/main/skills/productivity/writing-great-skills)

## What it does

`/qs-skill-write` create and improve focused, reliable AI skills. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/productivity/qs-skill-write/SKILL.md).

## When to reach for it

Use `/qs-skill-write` when the requested primary outcome is: create or improve an effective, reliable agent skill. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 190 in the specialist projection and is installed through `qs-specialists`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-skill-write` produces one normalized root result directly in chat. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

Every result emits three ranked copy-ready continuations: one preferred prompt and two alternatives. Public skills are never executed automatically. Brief output shows the decision-grade result and all three prompts; full output adds supporting evidence without adding prompts.

The default ranked continuations are `/qs-review-code`, `/qs-test-verify`, `/qs-git-merge`. Failed results instead rank `/qs-review-code`, `/qs-test-verify`, `/qs-flow-handoff`.

The result links every verified governing specification and previews the remaining build from those specs or their tracker. If no governing specification can be located, it says so instead of inventing a link or backlog.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
