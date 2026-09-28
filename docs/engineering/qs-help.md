# QS Help

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-help/SKILL.md) · [Upstream inspiration](https://github.com/mattpocock/skills/tree/main/skills/engineering/ask-matt)

## What it does

`/qs-help` find the right QuickStark skill or workflow. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/engineering/qs-help/SKILL.md).

## When to reach for it

Use `/qs-help` when the requested primary outcome is: find the right skill or workflow for my current task. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 10 in the core projection and is installed through `qs-skills`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/qs-help` produces one normalized root result directly in chat. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

A result emits at most one copy-ready next-work prompt when a distinct actionable item remains. A complete result with no verified remaining work emits none. Public skills are never executed automatically. Brief output shows the decision-grade result and optional prompt; full output adds supporting evidence without adding prompts.

Primary Help routing may select any registered public root whose exact literal is verified in the active host. Generated private routing metadata supplies descriptions and Codex/Claude/Pi literals without importing public skill bodies. Missing availability produces a package/discovery prerequisite, not an executable prompt or automatic installation. Ordinary continuations remain `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-setup`; failure routes remain `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-setup`. Choose at most one prompt overall and never execute the selected root.

Every run keeps a conversation checklist and reports its current stage, estimated stage and overall completion, observed progress or waiting, and needed input at the start, transitions, blockers, resumption, completion, and roughly every sixty seconds when control returns. Overall covers the root task or, in a submitted goal workflow, the entire authorized goal. Weight estimates by remaining effort and verified milestones, explain recalibration, retain defensible estimates while waiting, and reserve 100% for verified completion. Helpers contribute evidence only to their parent without double-counting. Finish with changes, checks, and remaining work.

Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).
