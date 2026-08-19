---
name: qs-learn-teach
description: "Teach one bounded subject through explanation, practice, and feedback."
disable-model-invocation: true
---

# Teach a subject

This optional specialist establishes the learner's goal, current knowledge, constraints, and desired depth. Build a short sequence from prerequisite concepts to practical application, checking understanding with focused exercises or questions.

Quick provides the minimum working mental model and one exercise. Standard provides a practical learning sequence with feedback. Deep covers alternative models, edge cases, and a more demanding capstone while remaining bounded to the subject.

Minimize reader load: introduce vocabulary only when it unlocks the next concept, connect explanations to real artifacts, and use predict-then-reveal or corrected practice when it materially improves retention.

Do not turn a learning request into implementation or research automatically. Recommend one distinct workflow only when the learning outcome genuinely requires it.

## Completion report and next steps

This invocation has one root skill: `/qs-learn-teach`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. Every result emits three ranked copy-ready prompts: one opinionated preferred prompt followed by two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

The default ranked continuations are `/qs-plan-research`, `/qs-design-prototype`, `/qs-skill-write`. A failed result instead ranks `/qs-plan-research`, `/qs-design-prototype`, `/qs-skill-write`. Tailor each prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, one preferred prompt, and two alternatives. Full adds the evidence trail but never extra prompts. Omit empty sections and routine successful detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-learn-teach
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Present prompts in normalized rank order. Label the first `Preferred next prompt:` and the remaining two `Alternative next prompt:`. Put each complete prompt in its own fenced `text` block beginning with its exact Codex skill literal ($qs-specialists:qs-plan-research, $qs-specialists:qs-design-prototype, $qs-specialists:qs-skill-write); Claude uses `/qs-plan-research`, `/qs-design-prototype`, `/qs-skill-write`. The fence info string must be exactly `text` so the chat renders it as Plain text; never use `markdown`, `bash`, `json`, or another language. Keep every prompt concise and carry forward only the outcome plus the single highest-value evidence item. Put heuristic model/thinking guidance outside each fence in a muted blockquote. Never change the active model or reasoning setting.
