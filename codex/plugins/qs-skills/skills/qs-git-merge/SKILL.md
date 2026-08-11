---
name: qs-git-merge
description: "Inspect and safely integrate only explicitly selected Git and GitHub changes."
---

# Integrate selected changes

Resolve the repository root, current branch, upstream, ahead/behind state, dirty files, commits, checks, and actual pull request before choosing an operation.

## Safety

- Preserve unrelated dirty files and never stage them implicitly.
- Do not invent a feature branch or pull request when the selected commit is already on the default branch.
- Never force-push, delete, reset, or rewrite published history without explicit authorization.
- A local commit is not published until the tracked remote proves it.
- Treat the `upstream` remote as read-only and never push personalized changes to it.
- Git integration is separate from deployment and release execution.

Perform only the requested push, pull request, merge, rebase, or conflict resolution. Re-run the checks made relevant by integration and verify the remote/PR state afterward. End after Git integration; do not deploy automatically.

Distinguish the actual cases explicitly: an ahead default branch may require an explicitly requested or approved `git push origin main`, with no branch merge required; a feature branch may require a pull request; an existing pull request may require merge; diverged branches may require merge or rebase conflict resolution. Never describe one case as another.

## Completion report and next steps

This invocation has one root skill: `/qs-git-merge`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. Every result emits three ranked copy-ready prompts: one opinionated preferred prompt followed by two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

The default ranked continuations are `/qs-deploy-release`, `/qs-review-code`, `/qs-flow-handoff`. A failed result instead ranks `/qs-review-code`, `/qs-code-debug`, `/qs-flow-handoff`. Tailor each prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, one preferred prompt, and two alternatives. Full adds the evidence trail but never extra prompts. Omit empty sections and routine successful detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-git-merge
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Present prompts in normalized rank order. Label the first `Preferred next prompt:` and the remaining two `Alternative next prompt:`. Put each complete prompt in its own fenced `text` block beginning with its exact Codex skill literal ($qs-skills:qs-deploy-release, $qs-skills:qs-review-code, $qs-skills:qs-flow-handoff, $qs-skills:qs-code-debug); Claude uses `/qs-deploy-release`, `/qs-review-code`, `/qs-flow-handoff`, `/qs-code-debug`. The fence info string must be exactly `text` so the chat renders it as Plain text; never use `markdown`, `bash`, `json`, or another language. Keep every prompt concise and carry forward only the outcome plus the single highest-value evidence item. Put heuristic model/thinking guidance outside each fence in a muted blockquote. Never change the active model or reasoning setting.
