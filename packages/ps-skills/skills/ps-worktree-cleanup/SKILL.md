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

This invocation has one root skill: `/ps-worktree-cleanup`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. Every result emits three ranked copy-ready prompts: one opinionated preferred prompt followed by two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

The default ranked continuations are `/qs-flow-handoff`, `/qs-setup`, `/ps-help`. A failed result instead ranks `/qs-flow-handoff`, `/ps-help`, `/qs-setup`. Tailor each prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, one preferred prompt, and two alternatives. Full adds the evidence trail but never extra prompts. Omit empty sections and routine successful detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /ps-worktree-cleanup
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Present prompts in normalized rank order. Label the first `Preferred next prompt:` and the remaining two `Alternative next prompt:`. Put each complete prompt in its own fenced `text` block beginning with its exact Codex skill literal ($qs-skills:qs-flow-handoff, $qs-skills:qs-setup, $ps-skills:ps-help); Claude uses `/qs-flow-handoff`, `/qs-setup`, `/ps-help`. The fence info string must be exactly `text` so the chat renders it as Plain text; never use `markdown`, `bash`, `json`, or another language. Keep every prompt concise and carry forward only the outcome plus the single highest-value evidence item. Put heuristic model/thinking guidance outside each fence in a muted blockquote. Never change the active model or reasoning setting.
