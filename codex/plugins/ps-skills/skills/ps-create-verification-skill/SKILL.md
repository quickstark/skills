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

Resolve governing specifications from explicit input, repository documentation, or a verified tracker. Every result includes `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Include `Remaining build:` with a known total when available and a preview of up to three highest-priority pending requirements or tickets. Write `None identified against linked specs` only after verifying completion against those specs.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/ps-maintain-verification-skill`, `/qs-review-code`, `/qs-git-merge`. Failure routes: `/qs-code-debug`, `/qs-review-code`, `/qs-flow-handoff`. Tailor every prompt to the completed work. When the remaining objective fits, the preferred prompt may use this catalog-approved composite workflow: $qs-skills:qs-review-code, then $qs-specialists:qs-test-verify, then $qs-skills:qs-git-merge. Treat every step as a separate public root with its own completion report and authority boundary. Continue in this session only after a Complete result; stop on continuation-required, input-required, failed. This combined prompt does not grant commit, merge, push, release, deployment, installation, or other mutation authority unless the shared objective explicitly grants that exact action. This preserves each separate public root, must stop on a non-complete result, and does not add mutation authority.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /ps-create-verification-skill
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Remaining build: concise verified preview
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($ps-skills:ps-maintain-verification-skill, $qs-skills:qs-review-code, $qs-skills:qs-git-merge, $qs-skills:qs-code-debug, $qs-skills:qs-flow-handoff); Claude uses `/ps-maintain-verification-skill`, `/qs-review-code`, `/qs-git-merge`, `/qs-code-debug`, `/qs-flow-handoff`; Pi uses `/skill:ps-maintain-verification-skill`, `/skill:qs-review-code`, `/skill:qs-git-merge`, `/skill:qs-code-debug`, `/skill:qs-flow-handoff`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
