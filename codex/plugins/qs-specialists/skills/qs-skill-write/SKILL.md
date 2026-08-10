---
name: qs-skill-write
description: "Create or improve one focused, testable agent skill."
---

# Write an agent skill

This optional specialist defines one durable user intent, explicit invocation boundary, allowed tools and mutations, bounded workflow, failure behavior, and independently verifiable completion contract.

Inspect the host's current skill format and repository conventions. Keep instructions direct, eliminate overlapping commands and automatic public-skill chains, reuse shared policy instead of duplicating boilerplate, and add behavioral validation for routing and safety. Never claim installation or publication until verified.

## Completion report and next steps

This invocation has one root skill: `/qs-skill-write`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

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

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-skill-write
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Top next prompt: None — the requested work is complete. | one copy-ready prompt in a fenced `text` block

When continuation is required, write `Top next prompt:` and place the single complete prompt beneath it in its own fenced `text` block beginning with the exact Codex skill literal $qs-skills:qs-review-code. Claude uses `/qs-review-code`. The fence info string must be exactly `text` so the chat renders it as Plain text; never use `markdown`, `bash`, `json`, or another language. Put heuristic model/thinking guidance outside the fence in a muted blockquote beneath it. Never change the active model or reasoning setting.
