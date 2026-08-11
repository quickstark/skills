---
name: qs-setup
description: "Prepare or verify QuickStark configuration for one project."
disable-model-invocation: true
---

# QuickStark setup

Prepare or verify only the selected project. Inspect existing configuration before editing and preserve project conventions.

## Behavior

1. Resolve the repository root and read its agent instructions.
2. Detect the issue tracker, documentation conventions, test commands, release workflow, and existing QuickStark configuration.
3. Ask only for a material choice that cannot be inferred safely.
4. Create or repair the minimum project-owned configuration needed for the confirmed workflow.
5. Run targeted validation and report actual readiness.

Never create remote resources, credentials, releases, or deployments unless separately requested. Setup ends after configuration verification; it does not start planning or implementation.

## Modes

- Quick: verify the existing configuration and report the first blocking gap.
- Standard: verify and safely repair the normal project configuration.
- Deep: include wider integration and documentation checks without expanding project scope.

## Completion report and next steps

This invocation has one root skill: `/qs-setup`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. Every result emits three ranked copy-ready prompts: one opinionated preferred prompt followed by two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

The default ranked continuations are `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-plan-roadmap`. A failed result instead ranks `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-plan-roadmap`. Tailor each prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, one preferred prompt, and two alternatives. Full adds the evidence trail but never extra prompts. Omit empty sections and routine successful detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-setup
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Present prompts in normalized rank order. Label the first `Preferred next prompt:` and the remaining two `Alternative next prompt:`. Put each complete prompt in its own fenced `text` block beginning with its exact Codex skill literal ($qs-skills:qs-plan-clarify, $qs-skills:qs-flow-triage, $qs-skills:qs-plan-roadmap); Claude uses `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-plan-roadmap`. The fence info string must be exactly `text` so the chat renders it as Plain text; never use `markdown`, `bash`, `json`, or another language. Keep every prompt concise and carry forward only the outcome plus the single highest-value evidence item. Put heuristic model/thinking guidance outside each fence in a muted blockquote. Never change the active model or reasoning setting.
