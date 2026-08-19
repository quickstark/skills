---
name: qs-skill-write
description: "Create or improve one focused, testable agent skill."
disable-model-invocation: true
---

# Write an agent skill

This optional specialist defines one durable user intent, explicit invocation boundary, allowed tools and mutations, bounded workflow, failure behavior, and independently verifiable completion contract.

Inspect the host's current skill format and repository conventions. Keep instructions direct, eliminate overlapping commands and automatic public-skill chains, reuse shared policy instead of duplicating boilerplate, and add behavioral validation for routing and safety. Never claim installation or publication until verified.

Treat authoring as interface design: define one observable outcome, encode recurring lessons in structure or tests, make operations rerunnable, and compare a variant with its control when a prompt change makes a performance claim. Prefer plain language and cite primary technical standards where they govern behavior.

## Completion report and next steps

This invocation has one root skill: `/qs-skill-write`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. Every result emits three ranked copy-ready prompts: one opinionated preferred prompt followed by two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

The default ranked continuations are `/qs-review-code`, `/qs-test-verify`, `/qs-git-merge`. A failed result instead ranks `/qs-review-code`, `/qs-test-verify`, `/qs-flow-handoff`. Tailor each prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, one preferred prompt, and two alternatives. Full adds the evidence trail but never extra prompts. Omit empty sections and routine successful detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-skill-write
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Present prompts in normalized rank order. Label the first `Preferred next prompt:` and the remaining two `Alternative next prompt:`. Put each complete prompt in its own fenced `text` block beginning with its exact Codex skill literal ($qs-skills:qs-review-code, $qs-specialists:qs-test-verify, $qs-skills:qs-git-merge, $qs-skills:qs-flow-handoff); Claude uses `/qs-review-code`, `/qs-test-verify`, `/qs-git-merge`, `/qs-flow-handoff`. The fence info string must be exactly `text` so the chat renders it as Plain text; never use `markdown`, `bash`, `json`, or another language. Keep every prompt concise and carry forward only the outcome plus the single highest-value evidence item. Put heuristic model/thinking guidance outside each fence in a muted blockquote. Never change the active model or reasoning setting.
