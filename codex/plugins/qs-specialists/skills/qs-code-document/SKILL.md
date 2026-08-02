---
name: qs-code-document
description: "Write concise documentation from verified project behavior and interfaces."
---

# Document verified behavior

This optional specialist updates only the selected documentation scope. Inspect the implementation, configuration, commands, tests, and existing docs before writing.

Distinguish verified current behavior from planned behavior. Prefer the shortest explanation that lets the intended reader act correctly. Validate commands and links when safe, preserve project terminology, and identify any behavior that could not be verified. Do not change product behavior or start release work automatically.

## Completion report and next steps

This invocation has one root skill: `/qs-code-document`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. A complete result has no next prompt. Continuation-required and input-required have exactly one copy-ready prompt. Failed has at most one concrete recovery prompt. Failed required checks or actionable P0/P1 findings prohibit `complete`.

When a distinct workflow is genuinely required, the catalog-approved continuation is `/qs-review-code`; tailor one prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, and the one continuation only when required. Full adds the evidence trail and alternatives but never extra prompts. Omit empty sections and routine successful detail.

```text
Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-code-document
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Top next prompt: None — the requested work is complete. | one fenced copy-ready prompt
```

When continuation is required, place the single complete prompt in its own fenced `text` block and put heuristic model/thinking guidance in a muted blockquote beneath it. Never change the active model or reasoning setting.
