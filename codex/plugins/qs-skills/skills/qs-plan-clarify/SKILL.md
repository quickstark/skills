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

Continue with safe, reversible, in-scope investigation when a reasonable assumption cannot change the requested outcome. If an unresolved choice would materially change scope, authority, behavior, or risk, name the evidence already gathered and request that decision instead of guessing or blocking on a low-value preference.

Use the internal domain-modeling capability when vocabulary ambiguity blocks agreement. Do not invoke old explore, interview, or domain commands. Do not continue into specification or implementation automatically.

## Completion report and next steps

This invocation has one root skill: `/qs-plan-clarify`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-plan-spec`, `/qs-plan-roadmap`, `/qs-flow-handoff`. Failure routes: `/qs-plan-spec`, `/qs-plan-roadmap`, `/qs-flow-handoff`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-plan-clarify
Outcome: Concise verified result.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-plan-spec, $qs-skills:qs-plan-roadmap, $qs-skills:qs-flow-handoff); Claude uses `/qs-plan-spec`, `/qs-plan-roadmap`, `/qs-flow-handoff`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
