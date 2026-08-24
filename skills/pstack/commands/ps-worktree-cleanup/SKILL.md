---
name: ps-worktree-cleanup
description: "Audit reclaimable worktrees and remove only explicitly confirmed exact targets."
disable-model-invocation: true
---

# Audit and clean worktrees

Default scope is Git worktrees only. Begin with a read-only audit and do not infer deletion authority.

## Behavior

1. Enumerate worktrees through Git and resolve each candidate to an exact canonical path, branch, revision, dirty state, untracked state, and merged or unmerged status.
2. Exclude broad roots, unresolved paths, globs, the active worktree, dirty or unmerged worktrees, and any ambiguous target.
3. Present the exact eligible targets and consequences.
4. Require confirmation bound to that exact target list before removal.
5. Revalidate immediately before each action and report what was removed, skipped, and whether recovery remains possible.

Simulator data, application state, package caches, and build caches are separate secondary scopes. Each requires an explicit user request, its own read-only audit, and separate exact-target confirmation; worktree approval never authorizes them. Cancellation or timeout produces an honest non-complete result.

## Completion report and next steps

This invocation has one root skill: `/ps-worktree-cleanup`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Resolve governing specifications from explicit input, repository documentation, or a verified tracker. Every result includes `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Include `Remaining build:` with a known total when available and a preview of up to three highest-priority pending requirements or tickets. Write `None identified against linked specs` only after verifying completion against those specs.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-flow-handoff`, `/qs-setup`, `/ps-help`. Failure routes: `/qs-flow-handoff`, `/ps-help`, `/qs-setup`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /ps-worktree-cleanup
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Remaining build: concise verified preview
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-flow-handoff, $qs-skills:qs-setup, $ps-skills:ps-help); Claude uses `/qs-flow-handoff`, `/qs-setup`, `/ps-help`; Pi uses `/skill:qs-flow-handoff`, `/skill:qs-setup`, `/skill:ps-help`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
