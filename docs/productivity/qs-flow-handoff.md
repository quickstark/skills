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

Every result emits three ranked copy-ready continuations: one preferred prompt and two alternatives. Public skills are never executed automatically. Brief output shows the decision-grade result and all three prompts; full output adds supporting evidence without adding prompts.

The default ranked continuations are `/qs-help`, `/qs-code-build`, `/qs-plan-clarify`. Failed results instead rank `/qs-help`, `/qs-code-build`, `/qs-plan-clarify`.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
