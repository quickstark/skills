---
name: qs-plan-spec
description: "Produce an actionable implementation specification, optionally including tickets."
---

# Write an implementation specification

Turn confirmed requirements into one implementation-ready specification. Do not reopen settled product decisions unless project evidence exposes a contradiction.

## Internal capabilities

Load the relevant non-command references from `skills/internal/` in the canonical repository or `capabilities/` in a packaged plugin:

- Domain modeling when precise vocabulary changes requirements or interfaces.
- Module decomposition when ownership, interfaces, or test seams need design.
- Ticket decomposition when explicitly requested, required by the configured tracker, or needed for safely assignable work.

Capability use remains part of this root run and produces no separate skill report.

## Specification contents

- Problem, scope, exclusions, and governing decisions.
- Current-state evidence and constraints.
- Required behavior, interfaces, data, failure handling, and migration impact.
- Implementation boundaries and dependency order.
- Verification evidence for every acceptance criterion.
- Security, operational, compatibility, and rollout concerns when relevant.
- Open questions only when they truly block implementation.

Specification-only requests do not create tickets. When tickets are requested, create dependency-ordered, independently verifiable slices in the same run. Do not start implementation automatically.

## Completion report and next steps

This invocation has one root skill: `/qs-plan-spec`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. A complete result has no next prompt. Continuation-required and input-required have exactly one copy-ready prompt. Failed has at most one concrete recovery prompt. Failed required checks or actionable P0/P1 findings prohibit `complete`.

When a distinct workflow is genuinely required, the catalog-approved continuation is `/qs-code-build`; tailor one prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, and the one continuation only when required. Full adds the evidence trail and alternatives but never extra prompts. Omit empty sections and routine successful detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-plan-spec
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Top next prompt: None — the requested work is complete. | one plain-text copy-ready prompt

When continuation is required, write `Top next prompt:` and place the single complete prompt beneath it as a plain Markdown paragraph beginning with the exact Codex skill literal $qs-skills:qs-code-build. Claude uses `/qs-code-build`. Never wrap the prompt in a fenced or indented code block, and do not put the prompt or skill literal in backticks. Put heuristic model/thinking guidance in a muted blockquote beneath it. Never change the active model or reasoning setting.
