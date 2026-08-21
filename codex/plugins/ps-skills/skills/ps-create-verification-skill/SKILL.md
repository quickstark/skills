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

This invocation has one root skill: `/ps-create-verification-skill`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/ps-maintain-verification-skill`, `/qs-review-code`, `/qs-git-merge`. Failure routes: `/qs-code-debug`, `/qs-review-code`, `/qs-flow-handoff`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /ps-create-verification-skill
Outcome: Concise verified result.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($ps-skills:ps-maintain-verification-skill, $qs-skills:qs-review-code, $qs-skills:qs-git-merge, $qs-skills:qs-code-debug, $qs-skills:qs-flow-handoff); Claude uses `/ps-maintain-verification-skill`, `/qs-review-code`, `/qs-git-merge`, `/qs-code-debug`, `/qs-flow-handoff`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
