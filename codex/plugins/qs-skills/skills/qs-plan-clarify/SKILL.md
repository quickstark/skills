---
name: qs-plan-clarify
description: "Turn ambiguity into a confirmed problem, scope, constraints, and decisions."
---

# Clarify a plan

Resolve the decisions that materially change scope, behavior, risk, or acceptance criteria. Exploration and focused interviewing are techniques inside this one run.

## Behavior

1. Inspect conversation, repository, issue, and documentation evidence before asking questions.
2. Treat explicit user statements and established project decisions as settled unless evidence conflicts.
3. Identify only unresolved material choices.
4. Ask one focused question at a time when user input is genuinely required; stop when the answer is sufficient.
5. Record the confirmed problem, users, scope, exclusions, constraints, acceptance evidence, decisions, and material exceptions.

Use the internal domain-modeling capability when vocabulary ambiguity blocks agreement. Do not invoke old explore, interview, or domain commands. Do not continue into specification or implementation automatically.

## Completion report and next steps

This invocation has one root skill: `/qs-plan-clarify`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. A complete result has no next prompt. Continuation-required and input-required have exactly one copy-ready prompt. Failed has at most one concrete recovery prompt. Failed required checks or actionable P0/P1 findings prohibit `complete`.

When a distinct workflow is genuinely required, the catalog-approved continuation is `/qs-plan-spec`; tailor one prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, and the one continuation only when required. Full adds the evidence trail and alternatives but never extra prompts. Omit empty sections and routine successful detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-plan-clarify
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Top next prompt: None — the requested work is complete. | one plain-text copy-ready prompt

When continuation is required, write `Top next prompt:` and place the single complete prompt beneath it as a plain Markdown paragraph beginning with the exact Codex skill literal $qs-skills:qs-plan-spec. Claude uses `/qs-plan-spec`. Never wrap the prompt in a fenced or indented code block, and do not put the prompt or skill literal in backticks. Put heuristic model/thinking guidance in a muted blockquote beneath it. Never change the active model or reasoning setting.
