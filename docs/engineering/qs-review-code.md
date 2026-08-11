# QS Review: Code

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-review-code/SKILL.md) · [Upstream inspiration](https://github.com/mattpocock/skills/tree/main/skills/engineering/code-review)

## What it does

`/qs-review-code` review, improve, or refactor selected code safely. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/engineering/qs-review-code/SKILL.md).

## When to reach for it

Use `/qs-review-code` when the requested primary outcome is: review, improve, or refactor the explicitly selected code scope safely. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 80 in the core projection and is installed through `qs-skills`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-review-code` produces one normalized root result and one authenticated hosted readout. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

Every result emits three ranked copy-ready continuations: one preferred prompt and two alternatives. Public skills are never executed automatically. Brief reports show the decision-grade result and all three prompts; full reports add supporting evidence without adding prompts.

The default ranked continuations are `/qs-git-merge`, `/qs-code-build`, `/qs-code-debug`. Failed results instead rank `/qs-code-build`, `/qs-code-debug`, `/qs-flow-handoff`.

The hosted and in-chat views consume the same normalized result. Ordinary runs return only an authenticated `https://reports.quickstark.com/` URL; local viewers remain explicit diagnostic tools. See [the shared skill-run contract](../skill-run-contract.md).
