# QS Setup

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-setup/SKILL.md) · [Upstream inspiration](https://github.com/mattpocock/skills/tree/main/skills/engineering/setup-matt-pocock-skills)

## What it does

`/qs-setup` configure project trackers, labels, and docs. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/engineering/qs-setup/SKILL.md).

## When to reach for it

Use `/qs-setup` when the requested primary outcome is: configure this project for the QuickStark engineering skills. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 20 in the core projection and is installed through `qs-skills`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-setup` produces one normalized root result and one authenticated hosted readout. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

Every result emits three ranked copy-ready continuations: one preferred prompt and two alternatives. Public skills are never executed automatically. Brief reports show the decision-grade result and all three prompts; full reports add supporting evidence without adding prompts.

The default ranked continuations are `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-plan-roadmap`. Failed results instead rank `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-plan-roadmap`.

The hosted and in-chat views consume the same normalized result. Ordinary runs return only an authenticated `https://reports.quickstark.com/` URL; local viewers remain explicit diagnostic tools. See [the shared skill-run contract](../skill-run-contract.md).
