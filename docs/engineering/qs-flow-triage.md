# QS Flow: Triage

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-flow-triage/SKILL.md) · [Upstream inspiration](https://github.com/mattpocock/skills/tree/main/skills/engineering/triage)

## What it does

`/qs-flow-triage` triage incoming issues into actionable work. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/engineering/qs-flow-triage/SKILL.md).

## When to reach for it

Use `/qs-flow-triage` when the requested primary outcome is: triage these incoming issues into clear, actionable work. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 110 in the core projection and is installed through `qs-skills`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-flow-triage` produces one normalized root result and one authenticated hosted readout. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

Every result emits three ranked copy-ready continuations: one preferred prompt and two alternatives. Public skills are never executed automatically. Brief reports show the decision-grade result and all three prompts; full reports add supporting evidence without adding prompts.

The default ranked continuations are `/qs-plan-roadmap`, `/qs-code-debug`, `/qs-code-build`. Failed results instead rank `/qs-code-debug`, `/qs-plan-roadmap`, `/qs-code-build`.

The hosted and in-chat views consume the same normalized result. Ordinary runs return only an authenticated `https://reports.quickstark.com/` URL; local viewers remain explicit diagnostic tools. See [the shared skill-run contract](../skill-run-contract.md).
