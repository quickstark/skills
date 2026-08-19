---
name: ps-trace-forensics
description: "Diagnose one supplied profiling or trace artifact without changing product behavior."
---

# Diagnose a supplied trace

Analyze one bounded trace, profile, recording, or diagnostic artifact as a read-only root.

## Behavior

1. Verify artifact identity, capture context, tool/version, time range, and expected baseline.
2. Redact or omit secrets, user payloads, and unsafe paths before reporting.
3. Identify dominant spans, stacks, waits, allocations, or event sequences.
4. Test competing hypotheses against the artifact and corroborating code.
5. Report the supported diagnosis, residual uncertainty, and reproducible evidence.

Do not repair product behavior or add durable instrumentation. If either is required, return `continuation-required` with a separate debug prompt.

## Completion report and next steps

This invocation has one root skill: `/ps-trace-forensics`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. Every result emits three ranked copy-ready prompts: one opinionated preferred prompt followed by two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

The default ranked continuations are `/qs-code-debug`, `/ps-runtime-forensics`, `/qs-flow-handoff`. A failed result instead ranks `/qs-code-debug`, `/qs-flow-handoff`, `/ps-runtime-forensics`. Tailor each prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, one preferred prompt, and two alternatives. Full adds the evidence trail but never extra prompts. Omit empty sections and routine successful detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /ps-trace-forensics
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Present prompts in normalized rank order. Label the first `Preferred next prompt:` and the remaining two `Alternative next prompt:`. Put each complete prompt in its own fenced `text` block beginning with its exact Codex skill literal ($qs-skills:qs-code-debug, $ps-skills:ps-runtime-forensics, $qs-skills:qs-flow-handoff); Claude uses `/qs-code-debug`, `/ps-runtime-forensics`, `/qs-flow-handoff`. The fence info string must be exactly `text` so the chat renders it as Plain text; never use `markdown`, `bash`, `json`, or another language. Keep every prompt concise and carry forward only the outcome plus the single highest-value evidence item. Put heuristic model/thinking guidance outside each fence in a muted blockquote. Never change the active model or reasoning setting.
