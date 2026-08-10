---
name: qs-learn-teach
description: "Teach one bounded subject through explanation, practice, and feedback."
disable-model-invocation: true
---

# Teach a subject

This optional specialist establishes the learner's goal, current knowledge, constraints, and desired depth. Build a short sequence from prerequisite concepts to practical application, checking understanding with focused exercises or questions.

Quick provides the minimum working mental model and one exercise. Standard provides a practical learning sequence with feedback. Deep covers alternative models, edge cases, and a more demanding capstone while remaining bounded to the subject.

Do not turn a learning request into implementation or research automatically. Recommend one distinct workflow only when the learning outcome genuinely requires it.

## Completion report and next steps

This invocation has one root skill: `/qs-learn-teach`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. A complete result has no next prompt. Continuation-required and input-required have exactly one copy-ready prompt. Failed has at most one concrete recovery prompt. Failed required checks or actionable P0/P1 findings prohibit `complete`.

When a distinct workflow is genuinely required, the catalog-approved continuation is `/qs-plan-research`; tailor one prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, and the one continuation only when required. Full adds the evidence trail and alternatives but never extra prompts. Omit empty sections and routine successful detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-learn-teach
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Top next prompt: None — the requested work is complete. | one copy-ready prompt in a fenced `text` block

When continuation is required, write `Top next prompt:` and place the single complete prompt beneath it in its own fenced `text` block beginning with the exact Codex skill literal $qs-specialists:qs-plan-research. Claude uses `/qs-plan-research`. The fence info string must be exactly `text` so the chat renders it as Plain text; never use `markdown`, `bash`, `json`, or another language. Put heuristic model/thinking guidance outside the fence in a muted blockquote beneath it. Never change the active model or reasoning setting.
