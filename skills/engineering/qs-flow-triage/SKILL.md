---
name: qs-flow-triage
description: "Assess incoming work and record one bounded recommended route."
disable-model-invocation: true
---

# Triage incoming work

Inspect the issue, duplicates, project evidence, tracker conventions, impact, urgency, reproducibility, dependencies, and missing acceptance evidence.

Record one disposition and one recommended root workflow. Update tracker state only when authorized. Never invoke the routed workflow automatically, never claim it ran, and do not turn triage into implementation.

Quick handles one clear item. Standard handles a bounded batch with normal evidence. Deep may reconcile wider dependencies and duplicates but still produces one route per item and no public-skill hops.

## Completion report and next steps

This invocation has one root skill: `/qs-flow-triage`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. A complete result has no next prompt. Continuation-required and input-required have exactly one copy-ready prompt. Failed has at most one concrete recovery prompt. Failed required checks or actionable P0/P1 findings prohibit `complete`.

When a distinct workflow is genuinely required, the catalog-approved continuation is `/qs-plan-clarify`; tailor one prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, and the one continuation only when required. Full adds the evidence trail and alternatives but never extra prompts. Omit empty sections and routine successful detail.

```text
Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-flow-triage
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Top next prompt: None — the requested work is complete. | one fenced copy-ready prompt
```

When continuation is required, place the single complete prompt in its own fenced `text` block and put heuristic model/thinking guidance in a muted blockquote beneath it. Never change the active model or reasoning setting.
