---
name: ps-create-verification-skill
description: "Create a project-local rerunnable verification workflow and feature map."
---

# Create a verification workflow

Create only explicitly selected project-local verification assets. Do not change product behavior.

## Behavior

1. Discover repository conventions, existing harnesses, local skill locations, and permitted write scope.
2. If the required real harness or target behavior is unavailable, request the missing input before writing.
3. Define a host-neutral verification-driver interface: setup, execute, observe, compare, and clean up.
4. Create a feature map recording feature identity, setup, action, observable result, checks, and evidence.
5. Make checks rerunnable, bounded, deterministic where practical, and safe after partial failure.
6. Run the workflow against real artifacts and distinguish verification defects from product defects.

Use a declared local-skill convention when one exists; otherwise use a clearly named generic verification directory approved by the user. Never repair product source or automatically publish the assets.

## Completion report and next steps

This invocation has one root skill: `/ps-create-verification-skill`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. Every result emits three ranked copy-ready prompts: one opinionated preferred prompt followed by two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

The default ranked continuations are `/ps-maintain-verification-skill`, `/qs-review-code`, `/qs-git-merge`. A failed result instead ranks `/qs-code-debug`, `/qs-review-code`, `/qs-flow-handoff`. Tailor each prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, one preferred prompt, and two alternatives. Full adds the evidence trail but never extra prompts. Omit empty sections and routine successful detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /ps-create-verification-skill
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Present prompts in normalized rank order. Label the first `Preferred next prompt:` and the remaining two `Alternative next prompt:`. Put each complete prompt in its own fenced `text` block beginning with its exact Codex skill literal ($ps-skills:ps-maintain-verification-skill, $qs-skills:qs-review-code, $qs-skills:qs-git-merge, $qs-skills:qs-code-debug, $qs-skills:qs-flow-handoff); Claude uses `/ps-maintain-verification-skill`, `/qs-review-code`, `/qs-git-merge`, `/qs-code-debug`, `/qs-flow-handoff`. The fence info string must be exactly `text` so the chat renders it as Plain text; never use `markdown`, `bash`, `json`, or another language. Keep every prompt concise and carry forward only the outcome plus the single highest-value evidence item. Put heuristic model/thinking guidance outside each fence in a muted blockquote. Never change the active model or reasoning setting.
