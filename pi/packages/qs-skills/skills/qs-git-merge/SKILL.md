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

Sequence integration into verifiable units. Migrate affected callers before removing legacy interfaces, and make each operation idempotent or explicitly detect already-completed remote state before retrying.

Distinguish the actual cases explicitly: an ahead default branch may require an explicitly requested or approved `git push origin main`, with no branch merge required; a feature branch may require a pull request; an existing pull request may require merge; diverged branches may require merge or rebase conflict resolution. Never describe one case as another.

## Completion report and next steps

This invocation has one root skill: `/qs-git-merge`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Resolve governing specifications from explicit input, repository documentation, or a verified tracker. Every result includes `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Include `Remaining build:` with a known total when available and a preview of up to three highest-priority pending requirements or tickets. Write `None identified against linked specs` only after verifying completion against those specs.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-deploy-release`, `/qs-review-code`, `/qs-flow-handoff`. Failure routes: `/qs-review-code`, `/qs-code-debug`, `/qs-flow-handoff`. Tailor every prompt to the completed work.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-git-merge
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Remaining build: concise verified preview
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-deploy-release, $qs-skills:qs-review-code, $qs-skills:qs-flow-handoff, $qs-skills:qs-code-debug); Claude uses `/qs-deploy-release`, `/qs-review-code`, `/qs-flow-handoff`, `/qs-code-debug`; Pi uses `/skill:qs-deploy-release`, `/skill:qs-review-code`, `/skill:qs-flow-handoff`, `/skill:qs-code-debug`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
