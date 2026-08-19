# PS Runtime Forensics

Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add ps-skills@quickstark
```

[Source](https://github.com/quickstark/skills/blob/main/skills/pstack/commands/ps-runtime-forensics/SKILL.md)

## What it does

`/ps-runtime-forensics` diagnose one live runtime symptom. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/pstack/commands/ps-runtime-forensics/SKILL.md).

## When to reach for it

Use `/ps-runtime-forensics` when the requested primary outcome is: diagnose this live runtime symptom from actual measurements without repairing it. Choose another root command when that would be only an intermediate technique.

## Where it fits

This is lifecycle position 50 in the optional PS projection and is installed through `ps-skills`. It owns one bounded root run and never starts another public skill automatically.

## Output and next steps

`/ps-runtime-forensics` produces one normalized root result and one authenticated hosted readout. It accepts independent `effort=quick|standard|deep` and `report=brief|full` modes, defaulting to `standard` and `brief`.

Every result emits three ranked copy-ready continuations: one preferred prompt and two alternatives. Public skills are never executed automatically. Brief reports show the decision-grade result and all three prompts; full reports add supporting evidence without adding prompts.

The default ranked continuations are `/qs-code-debug`, `/ps-trace-forensics`, `/qs-flow-handoff`. Failed results instead rank `/qs-code-debug`, `/qs-flow-handoff`, `/ps-trace-forensics`.

The hosted and in-chat views consume the same normalized result. Ordinary runs return only an authenticated `https://reports.quickstark.com/` URL; local viewers remain explicit diagnostic tools. See [the shared skill-run contract](../skill-run-contract.md).
